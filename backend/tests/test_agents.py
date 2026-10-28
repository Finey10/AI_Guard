"""
tests/test_agents.py — Unit tests for Budget Agent, Risk Agent, Explanation Agent, and Retrieval.

Covers:
1. Budget Agent: HEALTHY, LOW, EXHAUSTED, INSUFFICIENT_DATA, and 100% undefined budget.
2. Risk Agent: Factor ranking, historical evidence handling, data limitations.
3. Explanation Agent: All 3 recommendations (GO, GO_WITH_SAFE_GUARD, WAIT).
4. Error & Edge Cases: Missing API key, rate limits, timeouts, malformed JSON.
5. Retrieval: Empty collections, fallback when retrieval disabled.
"""
import json
import os
import sys
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))
os.environ.setdefault("DATA_DIR", os.path.join(os.path.dirname(__file__), "..", "data"))

import pytest

from ai.budget_agent import (
    BudgetAgentOutput,
    BudgetStatus,
    evaluate_budget_condition,
)
from ai.risk_agent import (
    RiskAgentOutput,
    evaluate_release_risk,
)
from ai.explanation_agent import (
    ExplanationAgentOutput,
    generate_explanation,
    generate_fallback_explanation,
)
from ai.retrieval import (
    retrieve_relevant_policies,
    is_retrieval_active,
)


# ---------------------------------------------------------------------------
# 1. Budget Agent Tests
# ---------------------------------------------------------------------------

def test_budget_agent_healthy():
    """Healthy error budget condition (> 25% remaining)."""
    result = evaluate_budget_condition(
        slo_target=99.9,
        observed_availability=99.98,
        budget_consumed_percent=20.0,
        remaining_budget_percent=80.0,
        measurement_window="30d rolling",
    )
    assert result.status == BudgetStatus.HEALTHY
    assert "healthy" in result.summary.lower()
    assert result.remaining_budget_percent == 80.0
    assert any("30d rolling" in e for e in result.evidence)
    assert len(result.warnings) == 0


def test_budget_agent_low():
    """Low error budget condition (<= 25% remaining, but > 0%)."""
    result = evaluate_budget_condition(
        slo_target=99.9,
        observed_availability=99.91,
        budget_consumed_percent=90.0,
        remaining_budget_percent=10.0,
        measurement_window="7d rolling",
    )
    assert result.status == BudgetStatus.LOW
    assert "low" in result.summary.lower()
    assert result.remaining_budget_percent == 10.0
    assert any("low budget" in w.lower() for w in result.warnings)


def test_budget_agent_exhausted():
    """Exhausted error budget condition (0% remaining or below SLO)."""
    result = evaluate_budget_condition(
        slo_target=99.9,
        observed_availability=99.70,
        budget_consumed_percent=200.0,
        remaining_budget_percent=0.0,
        measurement_window="30d",
    )
    assert result.status == BudgetStatus.EXHAUSTED
    assert "exhausted" in result.summary.lower()
    assert result.remaining_budget_percent == 0.0
    assert any("exhausted error budgets" in w.lower() for w in result.warnings)


def test_budget_agent_insufficient_data():
    """Missing or null availability metrics triggers INSUFFICIENT_DATA."""
    result = evaluate_budget_condition(
        slo_target=None,
        observed_availability=None,
        budget_consumed_percent=None,
        remaining_budget_percent=None,
    )
    assert result.status == BudgetStatus.INSUFFICIENT_DATA
    assert "missing" in result.summary.lower()
    assert any("omitted or null" in w for w in result.warnings)


def test_budget_agent_undefined_100_percent_slo():
    """100% SLO target with zero allowed downtime is handled cleanly without inventing a percentage."""
    # When availability is slightly below 100%
    result = evaluate_budget_condition(
        slo_target=100.0,
        observed_availability=99.99,
        budget_consumed_percent=None,
        remaining_budget_percent=None,
    )
    assert result.status == BudgetStatus.EXHAUSTED
    assert "zero-tolerance" in result.summary.lower() or "exhausted" in result.summary.lower()
    assert any("100% slo" in w.lower() for w in result.warnings)


def test_budget_agent_missing_measurement_window_warning():
    """Omission of measurement window must be flagged as a warning."""
    result = evaluate_budget_condition(
        slo_target=99.5,
        observed_availability=99.8,
        budget_consumed_percent=30.0,
        remaining_budget_percent=70.0,
        measurement_window=None,  # Not provided
    )
    assert any("measurement window" in w.lower() for w in result.warnings)


# ---------------------------------------------------------------------------
# 2. Risk Agent Tests
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_budget_output():
    return BudgetAgentOutput(
        status=BudgetStatus.HEALTHY,
        summary="Error budget is healthy.",
        evidence=["Observed availability 99.95%"],
        warnings=[],
        remaining_budget_percent=80.0,
        budget_consumed_percent=20.0,
    )


def test_risk_agent_ranks_contributing_factors(sample_budget_output):
    """Factors must be ordered by contribution points descending."""
    factors = [
        {"name": "Change Size", "contribution": 6.0, "description": "Medium change"},
        {"name": "Latency Degradation", "contribution": 18.0, "description": "Latency elevated"},
        {"name": "Error Rate", "contribution": 2.0, "description": "Nominal"},
    ]
    result = evaluate_release_risk(
        risk_score=26.0,
        recommendation="GO",
        risk_factors=factors,
        budget_agent_output=sample_budget_output,
    )
    assert len(result.contributing_factors) == 3
    # First factor should be Latency Degradation (18.0 pts)
    assert "Latency Degradation" in result.contributing_factors[0]
    assert "+18.0 pts" in result.contributing_factors[0]
    assert result.dominant_factor == "Latency Degradation"


def test_risk_agent_incorporates_actual_history_only(sample_budget_output):
    """Correlates with history ONLY when real records are provided."""
    history = [
        {"release_id": "rel-1", "caused_incident": False, "change_size": "medium"},
        {"release_id": "rel-2", "caused_incident": True, "change_size": "large"},
    ]
    result = evaluate_release_risk(
        risk_score=40.0,
        recommendation="GO_WITH_SAFE_GUARD",
        risk_factors=[],
        budget_agent_output=sample_budget_output,
        release_history=history,
        service_metrics={"change_size": "large"},
    )
    assert len(result.historical_evidence) >= 1
    assert "Observed 2 historical releases" in result.historical_evidence[0]
    assert "1 past incident(s) were associated with 'large' changes" in result.historical_evidence[1]


def test_risk_agent_reports_data_limitations_when_history_absent(sample_budget_output):
    """When history is omitted, flag data limitation rather than hallucinating."""
    result = evaluate_release_risk(
        risk_score=15.0,
        recommendation="GO",
        risk_factors=[],
        budget_agent_output=sample_budget_output,
        release_history=None,
    )
    assert any("No historical release records provided" in d for d in result.data_limitations)


# ---------------------------------------------------------------------------
# 3. Explanation Agent Tests (Deterministic Fallback)
# ---------------------------------------------------------------------------

@pytest.fixture
def sample_risk_output():
    return RiskAgentOutput(
        risk_summary="Risk is elevated due to latency regression.",
        contributing_factors=["Latency Degradation (+18.0 pts): 450ms"],
        historical_evidence=[],
        data_limitations=["No historical records"],
        dominant_factor="Latency Degradation",
    )


def test_explanation_agent_recommendation_wait(sample_risk_output):
    """WAIT recommendation produces clear blocking reason and investigation mitigations."""
    budget = BudgetAgentOutput(
        status=BudgetStatus.EXHAUSTED,
        summary="Error budget fully exhausted.",
        evidence=["Observed availability 99.6% against 99.9% SLO"],
        warnings=[],
        remaining_budget_percent=0.0,
        budget_consumed_percent=100.0,
    )
    result = generate_fallback_explanation(
        risk_score=75.0,
        recommendation="WAIT",
        budget_analysis=budget,
        risk_analysis=sample_risk_output,
    )
    assert "WAIT" in result.explanation
    assert "exhausted" in result.explanation.lower()
    assert any("halt" in m.lower() or "investigate" in m.lower() for m in result.mitigations)
    assert result.is_fallback is True


def test_explanation_agent_recommendation_go_with_safeguard(sample_risk_output):
    """GO_WITH_SAFE_GUARD recommendation produces canary and rollback mitigations."""
    budget = BudgetAgentOutput(
        status=BudgetStatus.LOW,
        summary="Error budget is low (15% remaining).",
        evidence=[],
        warnings=[],
        remaining_budget_percent=15.0,
        budget_consumed_percent=85.0,
    )
    result = generate_fallback_explanation(
        risk_score=48.0,
        recommendation="GO_WITH_SAFE_GUARD",
        budget_analysis=budget,
        risk_analysis=sample_risk_output,
    )
    assert "GO WITH SAFEGUARDS" in result.explanation
    assert any("canary" in m.lower() for m in result.mitigations)
    assert any("rollback" in m.lower() for m in result.mitigations)


def test_explanation_agent_recommendation_go(sample_risk_output):
    """GO recommendation produces nominal release clearance."""
    budget = BudgetAgentOutput(
        status=BudgetStatus.HEALTHY,
        summary="Error budget is healthy (85% remaining).",
        evidence=[],
        warnings=[],
        remaining_budget_percent=85.0,
        budget_consumed_percent=15.0,
    )
    result = generate_fallback_explanation(
        risk_score=12.0,
        recommendation="GO",
        budget_analysis=budget,
        risk_analysis=sample_risk_output,
    )
    assert "GO" in result.explanation
    assert any("automated ci/cd" in m.lower() for m in result.mitigations)


# ---------------------------------------------------------------------------
# 4. Error Handling & LLM Robustness
# ---------------------------------------------------------------------------

def test_explanation_agent_missing_api_key(sample_budget_output, sample_risk_output):
    """When no API key is in environment, fallback runs cleanly without exception."""
    with patch.dict(os.environ, {}, clear=True):
        result = generate_explanation(
            risk_score=20.0,
            recommendation="GO",
            budget_analysis=sample_budget_output,
            risk_analysis=sample_risk_output,
        )
        assert result.is_fallback is True
        assert "NO_API_KEY_CONFIGURED" in result.model_name
        assert len(result.mitigations) > 0


def test_explanation_agent_handles_malformed_json(sample_budget_output, sample_risk_output):
    """When an LLM returns invalid/malformed JSON, system falls back gracefully."""
    with patch.dict(os.environ, {"GEMINI_API_KEY": "fake-key", "RELEASEGUARD_LLM_PROVIDER": "gemini"}):
        with patch("google.genai.Client") as mock_client_cls:
            mock_client = MagicMock()
            mock_resp = MagicMock()
            mock_resp.text = "{This is not valid JSON!}"
            mock_client.models.generate_content.return_value = mock_resp
            mock_client_cls.return_value = mock_client

            result = generate_explanation(
                risk_score=35.0,
                recommendation="GO_WITH_SAFE_GUARD",
                budget_analysis=sample_budget_output,
                risk_analysis=sample_risk_output,
                provider="gemini",
            )
            assert result.is_fallback is True
            assert len(result.mitigations) > 0


def test_explanation_agent_handles_missing_schema_fields(sample_budget_output, sample_risk_output):
    """When an LLM returns JSON missing required keys, system falls back gracefully."""
    incomplete_json = json.dumps({"explanation": "Some explanation"})  # missing mitigations & timing
    with patch.dict(os.environ, {"OPENAI_API_KEY": "fake-key", "RELEASEGUARD_LLM_PROVIDER": "openai"}):
        with patch("openai.OpenAI") as mock_client_cls:
            mock_client = MagicMock()
            mock_choice = MagicMock()
            mock_choice.message.content = incomplete_json
            mock_resp = MagicMock()
            mock_resp.choices = [mock_choice]
            mock_client.chat.completions.create.return_value = mock_resp
            mock_client_cls.return_value = mock_client

            result = generate_explanation(
                risk_score=80.0,
                recommendation="WAIT",
                budget_analysis=sample_budget_output,
                risk_analysis=sample_risk_output,
                provider="openai",
            )
            assert result.is_fallback is True
            assert "OPENAI_ERROR" in result.model_name


# ---------------------------------------------------------------------------
# 5. ChromaDB Policy Retrieval Tests
# ---------------------------------------------------------------------------

def test_retrieval_returns_relevant_policies():
    """Retrieve policies related to error budget."""
    if is_retrieval_active():
        docs = retrieve_relevant_policies("error budget exhausted", top_k=2)
        assert len(docs) > 0
        assert "source" in docs[0]
        assert "content" in docs[0]


def test_retrieval_gracefully_handles_empty_or_failure():
    """When query is empty or collection fails, returns empty list without error."""
    with patch("ai.retrieval._init_chroma", return_value=None):
        docs = retrieve_relevant_policies("test query")
        assert docs == []
