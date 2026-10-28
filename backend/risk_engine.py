"""
risk_engine.py — Deterministic risk scoring engine for ReleaseGuard.

IMPORTANT DISCLAIMER
--------------------
All weights, thresholds, and heuristics below are **prototype values** chosen
for demonstration purposes only. They are NOT validated industry standards and
should not be used for real operational decision-making without proper
calibration against real incident data.

Timezone policy
---------------
This module does not handle timestamps directly. All datetime normalisation is
performed upstream in schemas.py before reaching the engine.
"""
from __future__ import annotations

# ---------------------------------------------------------------------------
# Weights (max points per factor) — prototype heuristics only
# ---------------------------------------------------------------------------
WEIGHTS: dict[str, int] = {
    "budget_consumption": 30,   # max points
    "error_rate": 25,
    "latency_degradation": 20,
    "recent_incidents": 15,
    "change_size": 10,
}

# ---------------------------------------------------------------------------
# Thresholds — prototype heuristics only
# ---------------------------------------------------------------------------
THRESHOLDS: dict[str, dict] = {
    # 0–29 → GO, 30–59 → GO_WITH_SAFE_GUARD, 60–100 → WAIT
    "recommendation": {"go": 30, "go_with_safeguard": 60},
    "error_rate": {"low": 0.5, "high": 2.0},         # percent
    "latency_ratio": {"low": 0.7, "high": 1.0},      # latency_ms / threshold_ms
    "incidents": {"medium": 1, "high": 3},
}

# Change-size point lookup
_CHANGE_SIZE_POINTS: dict[str, float] = {
    "small": 2.0,
    "medium": 6.0,
    "large": 10.0,
}


# ---------------------------------------------------------------------------
# Error budget helper
# ---------------------------------------------------------------------------

def calculate_error_budget(slo_target: float, observed_availability: float) -> dict:
    """
    Compute error budget metrics.

    Parameters
    ----------
    slo_target : float
        The SLO target as a percentage (e.g. 99.9).
    observed_availability : float
        The currently observed availability as a percentage.

    Returns
    -------
    dict with keys:
        budget_consumed_percent  – 0–100+ (can exceed 100 if below SLO)
        remaining_budget_percent – 0–100  (floored at 0)
        is_exhausted             – bool

    Timezone policy: inputs are pure percentages; no timestamps involved.

    Edge case: slo_target == 100.0 is zero-tolerance (no finite budget).
    Any availability below 100.0 is treated as exhausted.
    """
    if slo_target >= 100.0:
        # Zero-tolerance: any downtime exhausts the budget
        if observed_availability >= 100.0:
            return {
                "budget_consumed_percent": 0.0,
                "remaining_budget_percent": 100.0,
                "is_exhausted": False,
            }
        else:
            return {
                "budget_consumed_percent": 100.0,
                "remaining_budget_percent": 0.0,
                "is_exhausted": True,
            }

    # Allowed downtime window (in percentage points)
    allowed_downtime = 100.0 - slo_target        # e.g. 0.1 for 99.9%
    actual_downtime = 100.0 - observed_availability  # e.g. 0.05

    if allowed_downtime <= 0:
        # Guard against floating-point edge
        consumed = 100.0 if actual_downtime > 0 else 0.0
    else:
        consumed = (actual_downtime / allowed_downtime) * 100.0

    consumed = round(consumed, 4)
    remaining = round(max(0.0, 100.0 - consumed), 4)
    is_exhausted = remaining <= 0.0

    return {
        "budget_consumed_percent": consumed,
        "remaining_budget_percent": remaining,
        "is_exhausted": is_exhausted,
    }


# ---------------------------------------------------------------------------
# Individual factor scorers
# ---------------------------------------------------------------------------

def _score_budget_consumption(budget_consumed_percent: float) -> tuple[float, str]:
    """0–30 points based on error budget consumed."""
    raw = (budget_consumed_percent / 100.0) * WEIGHTS["budget_consumption"]
    score = round(min(max(raw, 0.0), float(WEIGHTS["budget_consumption"])), 4)
    desc = (
        f"Error budget {budget_consumed_percent:.1f}% consumed "
        f"→ {score:.1f}/{WEIGHTS['budget_consumption']} pts"
    )
    return score, desc


def _score_error_rate(error_rate_percent: float) -> tuple[float, str]:
    """
    0–25 points.
    Linear scale: 0 pts at 0% error rate, 25 pts at >= 2.0%.
    """
    high = THRESHOLDS["error_rate"]["high"]
    raw = (error_rate_percent / high) * WEIGHTS["error_rate"]
    score = round(min(max(raw, 0.0), float(WEIGHTS["error_rate"])), 4)
    desc = (
        f"Error rate {error_rate_percent:.2f}% "
        f"(threshold {high}%) → {score:.1f}/{WEIGHTS['error_rate']} pts"
    )
    return score, desc


def _score_latency(latency_ms: float, latency_threshold_ms: float) -> tuple[float, str]:
    """
    0–20 points.
    Score = (latency_ms / latency_threshold_ms) * 20, clamped 0–20.
    """
    ratio = latency_ms / latency_threshold_ms
    raw = ratio * WEIGHTS["latency_degradation"]
    score = round(min(max(raw, 0.0), float(WEIGHTS["latency_degradation"])), 4)
    desc = (
        f"Latency {latency_ms:.0f}ms / threshold {latency_threshold_ms:.0f}ms "
        f"= {ratio:.2f}x → {score:.1f}/{WEIGHTS['latency_degradation']} pts"
    )
    return score, desc


def _score_recent_incidents(recent_incidents_30d: int) -> tuple[float, str]:
    """
    0–15 points.
    0 incidents → 0 pts, 1 → 7, 2 → 11, 3+ → 15.
    """
    mapping = {0: 0.0, 1: 7.0, 2: 11.0}
    score = mapping.get(recent_incidents_30d, 15.0)
    desc = (
        f"{recent_incidents_30d} incident(s) in last 30 days "
        f"→ {score:.0f}/{WEIGHTS['recent_incidents']} pts"
    )
    return score, desc


def _score_change_size(change_size: str) -> tuple[float, str]:
    """0–10 points: small=2, medium=6, large=10."""
    score = _CHANGE_SIZE_POINTS.get(change_size.lower(), 6.0)
    desc = f"Change size '{change_size}' → {score:.0f}/{WEIGHTS['change_size']} pts"
    return score, desc


# ---------------------------------------------------------------------------
# Safeguards / investigation recommendations
# ---------------------------------------------------------------------------

_SAFEGUARDS = [
    "Enable feature flags for incremental rollout (canary deploy)",
    "Pre-stage rollback procedure and verify one-click revert is ready",
    "Increase alert sensitivity for error rate and latency during rollout",
    "Schedule a go/no-go call 15 minutes after deployment with on-call team",
    "Ensure observability dashboards are open and being monitored live",
    "Limit blast radius by deploying to a single region first",
]

_INVESTIGATION_RECOMMENDATIONS = [
    "Investigate root cause of current error rate before proceeding",
    "Review recent incidents to confirm they are fully resolved",
    "Burn down error budget to a safe level before adding deployment risk",
    "Schedule deployment for a low-risk time window (e.g. Tuesday/Wednesday morning)",
    "Engage the on-call SRE team for a pre-deployment readiness review",
    "Consider breaking the change into smaller, lower-risk deployments",
    "Run a chaos/load test in staging to validate stability under expected traffic",
]


# ---------------------------------------------------------------------------
# Main scoring function
# ---------------------------------------------------------------------------

def analyze_release(
    *,
    service_name: str,
    slo_target: float,
    change_size: str,
    observed_availability: float,
    error_rate_percent: float,
    latency_ms: float,
    latency_threshold_ms: float,
    recent_incidents_30d: int,
) -> dict:
    """
    Compute a deterministic risk score and recommendation.

    Returns a dict compatible with AnalyzeReleaseResponse fields (excluding
    timing_advice, which is computed by data_service).

    Force-WAIT conditions (documented):
    1. Error budget exhausted (remaining_budget_percent == 0)
    2. observed_availability < slo_target (currently below SLO)
    3. Computed risk_score >= THRESHOLDS['recommendation']['go_with_safeguard'] (60)
    """
    # --- Error budget ---
    budget = calculate_error_budget(slo_target, observed_availability)

    # --- Factor scores ---
    b_score, b_desc = _score_budget_consumption(budget["budget_consumed_percent"])
    e_score, e_desc = _score_error_rate(error_rate_percent)
    l_score, l_desc = _score_latency(latency_ms, latency_threshold_ms)
    i_score, i_desc = _score_recent_incidents(recent_incidents_30d)
    c_score, c_desc = _score_change_size(change_size)

    risk_score = round(b_score + e_score + l_score + i_score + c_score, 2)
    risk_score = min(risk_score, 100.0)

    risk_factors = [
        {"name": "Error Budget Consumption", "contribution": b_score, "description": b_desc},
        {"name": "Error Rate",               "contribution": e_score, "description": e_desc},
        {"name": "Latency Degradation",      "contribution": l_score, "description": l_desc},
        {"name": "Recent Incidents (30d)",   "contribution": i_score, "description": i_desc},
        {"name": "Change Size",              "contribution": c_score, "description": c_desc},
    ]

    # --- Determine recommendation ---
    force_wait = False
    force_wait_reason = ""

    if budget["is_exhausted"]:
        force_wait = True
        force_wait_reason = "Error budget is fully exhausted."
    elif observed_availability < slo_target:
        force_wait = True
        force_wait_reason = (
            f"Service is currently below SLO ({observed_availability:.4f}% < {slo_target}%)."
        )
    elif risk_score >= THRESHOLDS["recommendation"]["go_with_safeguard"]:
        force_wait = True
        force_wait_reason = f"Risk score {risk_score} >= 60 threshold."

    safeguards: list[str] = []
    investigation_recommendations: list[str] = []

    if force_wait:
        recommendation = "WAIT"
        investigation_recommendations = list(_INVESTIGATION_RECOMMENDATIONS)
        summary = f"WAIT — {force_wait_reason} Do not deploy until risks are mitigated."
    elif risk_score >= THRESHOLDS["recommendation"]["go"]:
        recommendation = "GO_WITH_SAFE_GUARD"
        safeguards = list(_SAFEGUARDS)
        summary = (
            f"GO WITH SAFEGUARDS — Risk score {risk_score}/100. "
            "Proceed with caution and the listed safeguards."
        )
    else:
        recommendation = "GO"
        summary = f"GO — Risk score {risk_score}/100. Low risk; proceed normally."

    return {
        "service_name": service_name,
        "risk_score": risk_score,
        "recommendation": recommendation,
        "error_budget": {
            "slo_target": slo_target,
            "observed_availability": observed_availability,
            **budget,
        },
        "risk_factors": risk_factors,
        "safeguards": safeguards,
        "investigation_recommendations": investigation_recommendations,
        "summary": summary,
    }
