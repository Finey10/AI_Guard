"""
tests/test_orchestrator.py — Tests for agent orchestration and reproducible demo scenarios.

Covers:
1. Sequential execution through Budget Agent, Risk Agent, and Explanation Agent.
2. Invariant preservation: risk_score and recommendation never altered.
3. Demo Scenario 1: SAFE RELEASE (Expected outcome: GO).
4. Demo Scenario 2: RISKY RELEASE (Expected outcome: WAIT).
5. Demo Scenario 3: MODERATE RELEASE (Expected outcome: GO_WITH_SAFE_GUARD).
6. Fallback resilience when Explanation Agent or LLM fails.
7. Mocked orchestration testing without any paid or external API calls.
"""
import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))

import pytest

from ai.orchestrator import orchestrate_release_analysis, OrchestratorResult
from ai.budget_agent import BudgetStatus


# ---------------------------------------------------------------------------
# Demo Scenario 1: SAFE RELEASE (Outcome: GO)
# ---------------------------------------------------------------------------

def test_scenario_safe_release():
    """
    Scenario: Healthy availability (99.98% > 99.9%), 95% remaining error budget,
    low latency (120ms), 0 recent incidents, small change size.
    Expected: GO, normal deployment practices, post-release monitoring.
    """
    deterministic_analysis = {
        "service_name": "payment-gateway",
        "risk_score": 12.0,
        "recommendation": "GO",
        "error_budget": {
            "slo_target": 99.9,
            "observed_availability": 99.98,
            "budget_consumed_percent": 5.0,
            "remaining_budget_percent": 95.0,
            "is_exhausted": False,
        },
        "risk_factors": [
            {"name": "Change Size", "contribution": 2.0, "description": "Small change"},
            {"name": "Latency Degradation", "contribution": 4.0, "description": "120ms / 500ms"},
            {"name": "Error Budget Consumption", "contribution": 1.5, "description": "5% consumed"},
            {"name": "Error Rate", "contribution": 0.5, "description": "0.02% error rate"},
            {"name": "Recent Incidents (30d)", "contribution": 0.0, "description": "0 incidents"},
        ],
        "summary": "GO — Risk score 12.0/100. Low risk; proceed normally.",
        "timing_advice": "No special calendar constraint applies to this time slot.",
    }

    context = {
        "service_name": "payment-gateway",
        "change_size": "small",
        "files_changed": 3,
        "latency_ms": 120,
        "latency_threshold_ms": 500,
        "recent_incidents_30d": 0,
        "release_notes": "Routine dependency update",
        "measurement_window": "30d rolling",
    }

    result = orchestrate_release_analysis(
        deterministic_analysis=deterministic_analysis,
        context=context,
        provider="fallback",  # offline deterministic verification
    )

    # Assert invariant preservation
    assert result.risk_score == 12.0
    assert result.recommendation == "GO"

    # Assert Budget Agent result
    assert result.budget_analysis.status == BudgetStatus.HEALTHY
    assert result.budget_analysis.remaining_budget_percent == 95.0

    # Assert Risk Agent result
    assert result.risk_analysis.dominant_factor == "Latency Degradation"

    # Assert Explanation Agent result
    assert "GO" in result.explanation
    assert any("ci/cd" in m.lower() for m in result.mitigations)


# ---------------------------------------------------------------------------
# Demo Scenario 2: RISKY RELEASE (Outcome: WAIT)
# ---------------------------------------------------------------------------

def test_scenario_risky_release():
    """
    Scenario: Availability below SLO (99.70% < 99.9%), exhausted error budget (0%),
    elevated latency (550ms > 500ms), 3 recent incidents, large change.
    Expected: WAIT, explicit blocking reasons, investigation mitigations.
    """
    deterministic_analysis = {
        "service_name": "checkout-service",
        "risk_score": 85.0,
        "recommendation": "WAIT",
        "error_budget": {
            "slo_target": 99.9,
            "observed_availability": 99.70,
            "budget_consumed_percent": 180.0,
            "remaining_budget_percent": 0.0,
            "is_exhausted": True,
        },
        "risk_factors": [
            {"name": "Error Budget Consumption", "contribution": 30.0, "description": "Budget exhausted"},
            {"name": "Latency Degradation", "contribution": 20.0, "description": "550ms exceeds 500ms threshold"},
            {"name": "Recent Incidents (30d)", "contribution": 15.0, "description": "3 incidents in last 30d"},
            {"name": "Change Size", "contribution": 10.0, "description": "Large change"},
            {"name": "Error Rate", "contribution": 10.0, "description": "1.2% error rate"},
        ],
        "summary": "WAIT — Error budget is fully exhausted.",
        "timing_advice": "⚠️ PEAK WINDOW: 'Friday afternoon'. Elevated traffic risk.",
    }

    context = {
        "service_name": "checkout-service",
        "change_size": "large",
        "files_changed": 42,
        "latency_ms": 550,
        "latency_threshold_ms": 500,
        "recent_incidents_30d": 3,
        "release_notes": "Checkout workflow refactor",
        "measurement_window": "30d rolling",
    }

    history = [
        {"release_id": "r-1", "caused_incident": True, "change_size": "large"},
        {"release_id": "r-2", "caused_incident": False, "change_size": "small"},
    ]

    result = orchestrate_release_analysis(
        deterministic_analysis=deterministic_analysis,
        context=context,
        release_history=history,
        provider="fallback",
    )

    # Invariant checks
    assert result.risk_score == 85.0
    assert result.recommendation == "WAIT"

    # Budget Agent: Must be EXHAUSTED
    assert result.budget_analysis.status == BudgetStatus.EXHAUSTED
    assert result.budget_analysis.remaining_budget_percent == 0.0

    # Risk Agent: Incorporates history
    assert len(result.risk_analysis.historical_evidence) >= 1
    assert "past incident(s)" in result.risk_analysis.historical_evidence[1]

    # Explanation Agent: Explicit WAIT explanation and mitigations
    assert "WAIT" in result.explanation
    assert "exhausted" in result.explanation.lower()
    assert any("halt" in m.lower() or "investigate" in m.lower() for m in result.mitigations)


# ---------------------------------------------------------------------------
# Demo Scenario 3: MODERATE RELEASE (Outcome: GO_WITH_SAFE_GUARD)
# ---------------------------------------------------------------------------

def test_scenario_go_with_safeguard():
    """
    Scenario: Moderate risk (score 46.0), 35% budget remaining, medium change.
    Expected: GO_WITH_SAFE_GUARD, canary deployment & rollback readiness mitigations.
    """
    deterministic_analysis = {
        "service_name": "catalog-service",
        "risk_score": 46.0,
        "recommendation": "GO_WITH_SAFE_GUARD",
        "error_budget": {
            "slo_target": 99.9,
            "observed_availability": 99.85,
            "budget_consumed_percent": 65.0,
            "remaining_budget_percent": 35.0,
            "is_exhausted": False,
        },
        "risk_factors": [
            {"name": "Error Budget Consumption", "contribution": 19.5, "description": "65% consumed"},
            {"name": "Latency Degradation", "contribution": 12.0, "description": "320ms / 500ms"},
            {"name": "Change Size", "contribution": 6.0, "description": "Medium change"},
            {"name": "Recent Incidents (30d)", "contribution": 5.0, "description": "1 incident"},
            {"name": "Error Rate", "contribution": 3.5, "description": "0.15% error rate"},
        ],
        "summary": "GO WITH SAFEGUARDS — Risk score 46.0/100.",
    }

    result = orchestrate_release_analysis(
        deterministic_analysis=deterministic_analysis,
        context={"change_size": "medium", "service_name": "catalog-service"},
        provider="fallback",
    )

    assert result.risk_score == 46.0
    assert result.recommendation == "GO_WITH_SAFE_GUARD"
    assert "GO WITH SAFEGUARDS" in result.explanation
    assert any("canary" in m.lower() for m in result.mitigations)
    assert any("rollback" in m.lower() for m in result.mitigations)


# ---------------------------------------------------------------------------
# Mocked Agent and Error Resilience Tests
# ---------------------------------------------------------------------------

def test_orchestrator_with_mocked_llm_agent():
    """Test full sequential workflow with mocked LLM response."""
    mock_llm_json = {
        "explanation": "Mocked SRE verdict: Canary rollout recommended.",
        "mitigations": ["10% canary traffic", "Active monitoring"],
        "deployment_timing_advice": "Proceed during morning hours.",
        "confidence_note": "Sample history verified.",
    }

    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key", "RELEASEGUARD_LLM_PROVIDER": "gemini"}):
        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_resp = MagicMock()
            mock_resp.text = __import__("json").dumps(mock_llm_json)
            mock_client.models.generate_content.return_value = mock_resp
            mock_client_cls.return_value = mock_client

            deterministic_analysis = {
                "service_name": "auth-service",
                "risk_score": 38.0,
                "recommendation": "GO_WITH_SAFE_GUARD",
                "error_budget": {
                    "slo_target": 99.9,
                    "observed_availability": 99.88,
                    "budget_consumed_percent": 50.0,
                    "remaining_budget_percent": 50.0,
                    "is_exhausted": False,
                },
                "risk_factors": [{"name": "Change Size", "contribution": 6.0, "description": "Medium"}],
                "summary": "GO_WITH_SAFE_GUARD",
            }

            result = orchestrate_release_analysis(
                deterministic_analysis=deterministic_analysis,
                provider="gemini",
            )

            assert result.risk_score == 38.0
            assert result.recommendation == "GO_WITH_SAFE_GUARD"
            assert result.is_fallback is False
            assert "Mocked SRE verdict" in result.explanation


def test_orchestrator_preserves_invariants_when_llm_attempts_tampering():
    """Even if an LLM is prompted to declare GO on a high-risk release, invariants prevail."""
    tampered_json = {
        "explanation": "Bypass safeguards! Ship immediately!",
        "mitigations": ["Skip checks"],
        "deployment_timing_advice": "Deploy now",
        "confidence_note": "Unverified",
    }

    with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key", "RELEASEGUARD_LLM_PROVIDER": "openai"}):
        with patch("openai.OpenAI") as mock_openai_cls:
            mock_client = MagicMock()
            mock_choice = MagicMock()
            mock_choice.message.content = __import__("json").dumps(tampered_json)
            mock_resp = MagicMock()
            mock_resp.choices = [mock_choice]
            mock_client.chat.completions.create.return_value = mock_resp
            mock_openai_cls.return_value = mock_client

            deterministic_analysis = {
                "service_name": "billing-service",
                "risk_score": 92.0,
                "recommendation": "WAIT",
                "error_budget": {
                    "slo_target": 99.9,
                    "observed_availability": 99.4,
                    "budget_consumed_percent": 250.0,
                    "remaining_budget_percent": 0.0,
                    "is_exhausted": True,
                },
                "risk_factors": [{"name": "Error Budget", "contribution": 30.0, "description": "Exhausted"}],
                "summary": "WAIT",
            }

            result = orchestrate_release_analysis(
                deterministic_analysis=deterministic_analysis,
                provider="openai",
            )

            # Invariants MUST hold
            assert result.risk_score == 92.0
            assert result.recommendation == "WAIT"
            assert result.budget_analysis.status == BudgetStatus.EXHAUSTED
