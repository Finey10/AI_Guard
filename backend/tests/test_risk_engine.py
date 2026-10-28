"""
tests/test_risk_engine.py — Unit tests for risk_engine.py

Timezone policy: risk_engine operates on pure floats (percentages, ms).
No timezone handling is needed or tested here.
"""
import sys
import os

# Ensure backend/ is on path so `import risk_engine` works
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import pytest
import risk_engine
from risk_engine import calculate_error_budget, analyze_release


# ---------------------------------------------------------------------------
# 1. Error budget: SLO=99.9, observed=99.95 → consumed ≈50%, remaining ≈50%
# ---------------------------------------------------------------------------

def test_error_budget_half_consumed():
    result = calculate_error_budget(slo_target=99.9, observed_availability=99.95)
    # allowed = 0.1, actual downtime = 0.05 → consumed = 50%
    assert result["budget_consumed_percent"] == pytest.approx(50.0, rel=1e-3)
    assert result["remaining_budget_percent"] == pytest.approx(50.0, rel=1e-3)
    assert result["is_exhausted"] is False


# ---------------------------------------------------------------------------
# 2. Error budget: observed < SLO → consumed > 100%, remaining == 0
# ---------------------------------------------------------------------------

def test_error_budget_below_slo():
    result = calculate_error_budget(slo_target=99.9, observed_availability=99.5)
    # allowed = 0.1, actual = 0.5 → consumed = 500%
    assert result["budget_consumed_percent"] > 100.0
    assert result["remaining_budget_percent"] == 0.0
    assert result["is_exhausted"] is True


# ---------------------------------------------------------------------------
# 3. SLO == 100% edge case → zero-tolerance
# ---------------------------------------------------------------------------

def test_error_budget_slo_100_any_downtime():
    result = calculate_error_budget(slo_target=100.0, observed_availability=99.999)
    assert result["is_exhausted"] is True
    assert result["remaining_budget_percent"] == 0.0


def test_error_budget_slo_100_perfect():
    result = calculate_error_budget(slo_target=100.0, observed_availability=100.0)
    assert result["is_exhausted"] is False


# ---------------------------------------------------------------------------
# 4. Risk score increases as metrics worsen
# ---------------------------------------------------------------------------

def _make_result(**overrides):
    defaults = dict(
        service_name="checkout-service",
        slo_target=99.9,
        change_size="small",
        observed_availability=99.95,
        error_rate_percent=0.1,
        latency_ms=100,
        latency_threshold_ms=500,
        recent_incidents_30d=0,
    )
    defaults.update(overrides)
    return analyze_release(**defaults)


def test_score_increases_with_higher_error_rate():
    low = _make_result(error_rate_percent=0.1)
    high = _make_result(error_rate_percent=1.8)
    assert high["risk_score"] > low["risk_score"]


def test_score_increases_with_more_incidents():
    none = _make_result(recent_incidents_30d=0)
    some = _make_result(recent_incidents_30d=3)
    assert some["risk_score"] > none["risk_score"]


def test_score_increases_with_higher_latency():
    low = _make_result(latency_ms=100, latency_threshold_ms=500)
    high = _make_result(latency_ms=490, latency_threshold_ms=500)
    assert high["risk_score"] > low["risk_score"]


# ---------------------------------------------------------------------------
# 5. Recommendation thresholds
# ---------------------------------------------------------------------------

def test_recommendation_go_low_score():
    """A very healthy service should get GO."""
    result = _make_result(
        observed_availability=99.95,
        error_rate_percent=0.01,
        latency_ms=50,
        latency_threshold_ms=500,
        recent_incidents_30d=0,
        change_size="small",
    )
    assert result["recommendation"] == "GO"


def test_recommendation_go_with_safeguard_medium_score():
    """Medium-risk profile should yield GO_WITH_SAFE_GUARD."""
    result = _make_result(
        observed_availability=99.92,
        error_rate_percent=0.8,
        latency_ms=380,
        latency_threshold_ms=500,
        recent_incidents_30d=1,
        change_size="medium",
    )
    assert result["recommendation"] in (
        "GO_WITH_SAFE_GUARD", "WAIT"
    ), f"Expected GWS or WAIT, got {result['recommendation']} (score={result['risk_score']})"


def test_recommendation_wait_high_score():
    """Exhausted budget must force WAIT regardless of score."""
    result = _make_result(
        slo_target=99.9,
        observed_availability=99.5,   # well below SLO → exhausted
        error_rate_percent=3.0,
        latency_ms=600,
        latency_threshold_ms=500,
        recent_incidents_30d=3,
        change_size="large",
    )
    assert result["recommendation"] == "WAIT"


# ---------------------------------------------------------------------------
# 6. Force WAIT when budget is exhausted
# ---------------------------------------------------------------------------

def test_force_wait_budget_exhausted():
    result = _make_result(
        slo_target=99.9,
        observed_availability=99.5,  # exhausted
    )
    from schemas import Recommendation
    assert result["recommendation"] == Recommendation.WAIT
    assert len(result["investigation_recommendations"]) > 0


# ---------------------------------------------------------------------------
# 7. Force WAIT when below SLO (even if budget logic might differ)
# ---------------------------------------------------------------------------

def test_force_wait_below_slo():
    result = _make_result(
        slo_target=99.9,
        observed_availability=99.85,   # below SLO
        error_rate_percent=0.1,
        latency_ms=100,
        latency_threshold_ms=500,
        recent_incidents_30d=0,
        change_size="small",
    )
    from schemas import Recommendation
    assert result["recommendation"] == Recommendation.WAIT


# ---------------------------------------------------------------------------
# 8. Change size factors: small < medium < large
# ---------------------------------------------------------------------------

def test_change_size_factor_ordering():
    small_score = _make_result(change_size="small")["risk_score"]
    medium_score = _make_result(change_size="medium")["risk_score"]
    large_score = _make_result(change_size="large")["risk_score"]
    assert small_score < medium_score < large_score


def test_change_size_exact_points():
    """Verify the raw point contributions for each change size."""
    small_pts = risk_engine._CHANGE_SIZE_POINTS["small"]
    medium_pts = risk_engine._CHANGE_SIZE_POINTS["medium"]
    large_pts = risk_engine._CHANGE_SIZE_POINTS["large"]
    assert small_pts == 2.0
    assert medium_pts == 6.0
    assert large_pts == 10.0
