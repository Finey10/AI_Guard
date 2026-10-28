"""
tests/test_ai_advisor.py — Comprehensive unit and integration tests for AI Advisor.

Covers:
1. Invariance of backend risk_score and recommendation (strictly unchangeable).
2. Deterministic fallback behavior when API keys are absent or LLM fails.
3. Decision-specific explanations (WAIT/HOLD, GO_WITH_SAFE_GUARD/MONITOR, GO/DEPLOY).
4. Developer disagreement guidance on HOLD/WAIT decisions.
5. Actionable mitigations generation.
6. Anti-gaming safeguards and author privacy compliance.
7. Mocked LLM execution (Gemini & OpenAI adapters).
8. Integration with FastAPI endpoints (/api/analyze-release and /api/advisor/explain).
"""
import sys
import os
from unittest.mock import MagicMock, patch

# Ensure backend/ is on the Python path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))

import pytest
from httpx import AsyncClient, ASGITransport

import ai_advisor
from ai_advisor import (
    AIAdvisorOutput,
    DecisionAlias,
    Recommendation,
    generate_release_advice,
    generate_fallback_advice,
)
from main import app


# ---------------------------------------------------------------------------
# Test Fixtures & Sample Payloads
# ---------------------------------------------------------------------------

SAMPLE_WAIT_ANALYSIS = {
    "service_name": "checkout-service",
    "risk_score": 78.5,
    "recommendation": "WAIT",
    "error_budget": {
        "slo_target": 99.9,
        "observed_availability": 99.75,
        "budget_consumed_percent": 150.0,
        "remaining_budget_percent": 0.0,
        "is_exhausted": True,
    },
    "risk_factors": [
        {"name": "Error Budget Consumption", "contribution": 30.0, "description": "100% budget consumed"},
        {"name": "Latency Degradation", "contribution": 18.5, "description": "Latency 450ms exceeds 300ms threshold"},
        {"name": "Recent Incidents (30d)", "contribution": 15.0, "description": "3 incidents in 30 days"},
        {"name": "Change Size", "contribution": 10.0, "description": "Large release"},
        {"name": "Error Rate", "contribution": 5.0, "description": "Error rate 0.4%"},
    ],
    "safeguards": [],
    "investigation_recommendations": ["Investigate elevated error rate", "Hold release until budget resets"],
    "timing_advice": "⚠️ PEAK WINDOW: 'Friday afternoon'. Elevated traffic risk.",
    "summary": "WAIT — Error budget is fully exhausted.",
}

SAMPLE_MONITOR_ANALYSIS = {
    "service_name": "inventory-service",
    "risk_score": 45.0,
    "recommendation": "GO_WITH_SAFE_GUARD",
    "error_budget": {
        "slo_target": 99.5,
        "observed_availability": 99.6,
        "budget_consumed_percent": 40.0,
        "remaining_budget_percent": 60.0,
        "is_exhausted": False,
    },
    "risk_factors": [
        {"name": "Change Size", "contribution": 10.0, "description": "Large release"},
        {"name": "Latency Degradation", "contribution": 15.0, "description": "Latency 250ms"},
        {"name": "Error Budget Consumption", "contribution": 12.0, "description": "40% budget consumed"},
        {"name": "Error Rate", "contribution": 5.0, "description": "Error rate 0.2%"},
        {"name": "Recent Incidents (30d)", "contribution": 3.0, "description": "1 incident"},
    ],
    "safeguards": ["Enable feature flags", "Run 5% canary for 15 minutes"],
    "investigation_recommendations": [],
    "timing_advice": "✅ LOW-RISK WINDOW: 'Tuesday morning'. Good time to deploy.",
    "summary": "GO WITH SAFEGUARDS — Risk score 45.0/100.",
}

SAMPLE_DEPLOY_ANALYSIS = {
    "service_name": "notification-service",
    "risk_score": 15.0,
    "recommendation": "GO",
    "error_budget": {
        "slo_target": 99.9,
        "observed_availability": 99.98,
        "budget_consumed_percent": 5.0,
        "remaining_budget_percent": 95.0,
        "is_exhausted": False,
    },
    "risk_factors": [
        {"name": "Change Size", "contribution": 2.0, "description": "Small release"},
        {"name": "Error Budget Consumption", "contribution": 1.5, "description": "Nominal"},
        {"name": "Latency Degradation", "contribution": 4.0, "description": "Latency 80ms"},
        {"name": "Error Rate", "contribution": 2.5, "description": "Error rate 0.05%"},
        {"name": "Recent Incidents (30d)", "contribution": 0.0, "description": "0 incidents"},
    ],
    "safeguards": [],
    "investigation_recommendations": [],
    "timing_advice": "No special calendar constraint applies to this time slot.",
    "summary": "GO — Risk score 15.0/100. Low risk; proceed normally.",
}


# ---------------------------------------------------------------------------
# Invariance & Ground Truth Preservation Tests
# ---------------------------------------------------------------------------

def test_risk_score_and_recommendation_invariance():
    """Verify that backend risk_score and recommendation are strictly preserved."""
    # Test WAIT / HOLD
    advice_wait = generate_release_advice(SAMPLE_WAIT_ANALYSIS)
    assert advice_wait.risk_score == 78.5
    assert advice_wait.recommendation == Recommendation.WAIT
    assert advice_wait.decision_alias == DecisionAlias.HOLD

    # Test GO_WITH_SAFE_GUARD / MONITOR
    advice_mon = generate_release_advice(SAMPLE_MONITOR_ANALYSIS)
    assert advice_mon.risk_score == 45.0
    assert advice_mon.recommendation == Recommendation.GO_WITH_SAFE_GUARD
    assert advice_mon.decision_alias == DecisionAlias.MONITOR

    # Test GO / DEPLOY
    advice_go = generate_release_advice(SAMPLE_DEPLOY_ANALYSIS)
    assert advice_go.risk_score == 15.0
    assert advice_go.recommendation == Recommendation.GO
    assert advice_go.decision_alias == DecisionAlias.DEPLOY


def test_invariance_defends_against_hallucinated_llm_override():
    """Even if an LLM returns a different score or recommendation, backend invariants win."""
    hallucinated_json = {
        "explanation": "Hallucinated: Everything is fine, ship it!",
        "main_contributing_factors": ["Fake factor"],
        "mitigations": ["Skip checks"],
        "deployment_timing_advice": "Deploy anytime",
    }

    # Simulate an LLM call that attempted to return different values (e.g. claims low score 10.0 and GO for a high risk release)
    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key", "RELEASEGUARD_LLM_PROVIDER": "gemini"}):
        with patch("ai_advisor._call_gemini") as mock_gemini:
            mock_gemini.return_value = AIAdvisorOutput(
                risk_score=10.0,  # Intentional hallucination (claiming low risk)
                recommendation=Recommendation.GO,  # Intentional hallucination (claiming GO)
                decision_alias=DecisionAlias.DEPLOY,
                explanation="Hallucinated text",
                main_contributing_factors=["Factor 1"],
                mitigations=["Mitigation 1"],
                deployment_timing_advice="Timing 1",
                is_fallback=False,
                source="gemini",
                model_name="mocked-gemini",
            )
            # Input is WAIT with score 78.5
            output = generate_release_advice(SAMPLE_WAIT_ANALYSIS)

            # Invariance MUST override the hallucination
            assert output.risk_score == 78.5
            assert output.recommendation == Recommendation.WAIT
            assert output.decision_alias == DecisionAlias.HOLD


# ---------------------------------------------------------------------------
# Fallback Engine & Explanation Tests
# ---------------------------------------------------------------------------

def test_fallback_generates_sre_explanation_for_disagreeing_developer():
    """
    On WAIT/HOLD, the advisor must clearly articulate why a developer who
    wants to push code should not deploy (exhausted budget, peak window, etc.).
    """
    advice = generate_fallback_advice(SAMPLE_WAIT_ANALYSIS)
    assert advice.is_fallback is True
    assert "HOLD" in advice.explanation
    assert "error budget is exhausted" in advice.explanation
    assert "99.9" in advice.explanation  # mentions SLO target

    # Developer guidance for disagreement
    assert advice.developer_guidance is not None
    assert "Disagree with HOLD" in advice.developer_guidance
    assert "On-Call SRE" in advice.developer_guidance


def test_fallback_generates_ranked_contributing_factors():
    """Top factors must be sorted by contribution points."""
    advice = generate_fallback_advice(SAMPLE_WAIT_ANALYSIS)
    assert len(advice.main_contributing_factors) >= 1
    # Error Budget (30.0 pts) should be first
    assert "Error Budget Consumption" in advice.main_contributing_factors[0]
    assert "+30.0 pts" in advice.main_contributing_factors[0]


def test_fallback_generates_actionable_mitigations():
    """Actionable mitigation steps must be specific and operational."""
    advice_wait = generate_fallback_advice(SAMPLE_WAIT_ANALYSIS)
    assert len(advice_wait.mitigations) >= 3
    # Check for actionable terms
    mitigations_text = " ".join(advice_wait.mitigations).lower()
    assert "halt" in mitigations_text or "stabilizes" in mitigations_text
    assert "investigate" in mitigations_text or "reschedule" in mitigations_text

    # Monitor mitigations
    advice_mon = generate_fallback_advice(SAMPLE_MONITOR_ANALYSIS)
    mon_text = " ".join(advice_mon.mitigations).lower()
    assert "canary" in mon_text
    assert "rollback" in mon_text


def test_suggested_windows_included():
    """Ensure structured alternate deployment windows are provided."""
    advice = generate_fallback_advice(SAMPLE_WAIT_ANALYSIS)
    assert len(advice.suggested_windows) > 0
    assert any("Tuesday" in w.window for w in advice.suggested_windows)


# ---------------------------------------------------------------------------
# Compliance & Anti-Gaming Tests
# ---------------------------------------------------------------------------

def test_author_privacy_compliance():
    """
    Rubric: Author-related features must not become a tool for individual
    performance surveillance; aggregate or anonymise.
    """
    context_with_author = {
        "service_name": "checkout-service",
        "author_tenure_months": 2,  # Junior engineer
        "author_name": "Jane Doe",
    }
    advice = generate_fallback_advice(SAMPLE_WAIT_ANALYSIS, context=context_with_author)
    full_text = f"{advice.explanation} {' '.join(advice.mitigations)} {' '.join(advice.main_contributing_factors)}"

    # Ensure author's name or personal tenure surveillance are NOT in the explanation
    assert "Jane Doe" not in full_text
    assert "junior" not in full_text.lower()
    assert "tenure" not in full_text.lower()


def test_anti_gaming_safeguard_documentation():
    """Verify anti-gaming safeguard note is present on all outputs."""
    advice = generate_fallback_advice(SAMPLE_WAIT_ANALYSIS)
    assert advice.anti_gaming_note is not None
    assert "SLO" in advice.anti_gaming_note
    assert "Deterministic" in advice.anti_gaming_note


# ---------------------------------------------------------------------------
# Mocked Provider Integration Tests
# ---------------------------------------------------------------------------

def test_mock_gemini_success():
    """Test successful Gemini LLM invocation using mock."""
    mock_payload = {
        "explanation": "Gemini SRE Analysis: Release is safe to proceed under canary guardrails.",
        "main_contributing_factors": ["Change Size: moderate impact", "Latency: within nominal p99 bounds"],
        "mitigations": ["Deploy 10% canary traffic", "Monitor error rate for 10 minutes"],
        "deployment_timing_advice": "Recommended window: Tuesday morning.",
        "developer_guidance": "Standard operational procedures apply.",
    }

    with patch.dict(os.environ, {"GEMINI_API_KEY": "test-gemini-key", "RELEASEGUARD_LLM_PROVIDER": "gemini"}):
        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_response = MagicMock()
            mock_response.text = json_str = import_json = __import__("json").dumps(mock_payload)
            mock_client.models.generate_content.return_value = mock_response
            mock_client_cls.return_value = mock_client

            output = generate_release_advice(SAMPLE_MONITOR_ANALYSIS, provider="gemini")
            assert output.source == "gemini"
            assert output.is_fallback is False
            assert output.risk_score == 45.0
            assert output.recommendation == Recommendation.GO_WITH_SAFE_GUARD
            assert output.decision_alias == DecisionAlias.MONITOR
            assert "Gemini SRE Analysis" in output.explanation


def test_mock_openai_success():
    """Test successful OpenAI LLM invocation using mock."""
    mock_payload = {
        "explanation": "OpenAI SRE Analysis: Release cleared for standard deployment pipeline.",
        "main_contributing_factors": ["Error budget nominal", "Latency well within SLO"],
        "mitigations": ["Standard deployment", "Observe post-deploy metrics"],
        "deployment_timing_advice": "No calendar restrictions.",
        "developer_guidance": "Nominal conditions.",
    }

    with patch.dict(os.environ, {"OPENAI_API_KEY": "test-openai-key", "RELEASEGUARD_LLM_PROVIDER": "openai"}):
        with patch("openai.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_choice = MagicMock()
            mock_choice.message.content = __import__("json").dumps(mock_payload)
            mock_resp = MagicMock()
            mock_resp.choices = [mock_choice]
            mock_client.chat.completions.create.return_value = mock_resp
            mock_openai_cls.return_value = mock_client

            output = generate_release_advice(SAMPLE_DEPLOY_ANALYSIS, provider="openai")
            assert output.source == "openai"
            assert output.is_fallback is False
            assert output.risk_score == 15.0
            assert output.recommendation == Recommendation.GO
            assert output.decision_alias == DecisionAlias.DEPLOY


def test_llm_failure_triggers_graceful_fallback():
    """When an LLM call throws an exception, system falls back gracefully without raising."""
    with patch.dict(os.environ, {"GEMINI_API_KEY": "test-gemini-key", "RELEASEGUARD_LLM_PROVIDER": "gemini"}):
        with patch("google.genai.Client", side_effect=RuntimeError("Google Cloud Quota Exceeded")):
            output = generate_release_advice(SAMPLE_WAIT_ANALYSIS, provider="gemini")
            assert output.is_fallback is True
            assert output.source == "fallback"
            assert "GEMINI_ERROR" in output.model_name
            assert output.risk_score == 78.5
            assert output.decision_alias == DecisionAlias.HOLD


# ---------------------------------------------------------------------------
# FastAPI API Integration Tests
# ---------------------------------------------------------------------------

@pytest.mark.asyncio
async def test_api_analyze_release_returns_full_ai_advisor_schema():
    """POST /api/analyze-release returns enriched schema compatible with both backend & frontend."""
    payload = {
        "service_name": "checkout-service",
        "change_size": "medium",
        "files_changed": 10,
        "observed_availability": 99.92,
        "error_rate_percent": 0.3,
        "latency_ms": 180,
        "latency_threshold_ms": 500,
        "recent_incidents_30d": 1,
        "proposed_deployment_time": "2026-10-28T10:00:00Z",
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/analyze-release", json=payload)

    assert resp.status_code == 200
    data = resp.json()

    # Backend required fields
    assert "risk_score" in data
    assert "recommendation" in data
    assert "error_budget" in data
    assert "risk_factors" in data

    # Frontend required fields
    assert "remaining_budget_percent" in data
    assert "budget_consumed_percent" in data
    assert "explanation" in data
    assert "mitigations" in data
    assert "deployment_timing_advice" in data

    # AI Advisor enriched fields
    assert "decision_alias" in data
    assert data["decision_alias"] in ("DEPLOY", "MONITOR", "HOLD")
    assert "ai_advisor" in data
    assert data["ai_advisor"]["anti_gaming_note"] is not None
    assert len(data["mitigations"]) > 0


@pytest.mark.asyncio
async def test_api_advisor_explain_direct_endpoint():
    """POST /api/advisor/explain returns structured AIAdvisorOutput."""
    payload = {
        "precomputed_analysis": SAMPLE_WAIT_ANALYSIS,
        "context": {"service_name": "checkout-service"},
    }
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        resp = await client.post("/api/advisor/explain", json=payload)

    assert resp.status_code == 200
    data = resp.json()
    assert data["risk_score"] == 78.5
    assert data["recommendation"] == "WAIT"
    assert data["decision_alias"] == "HOLD"
    assert len(data["main_contributing_factors"]) > 0
    assert len(data["mitigations"]) > 0
    assert "HOLD" in data["explanation"]
