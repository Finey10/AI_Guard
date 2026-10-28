"""
risk_agent.py — Agent 2: Interprets deterministic risk analysis and explains main contributors.

Uses deterministic Python functions and actual telemetry data.
Does NOT create a competing risk score or override the backend recommendation.
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field

from ai.budget_agent import BudgetAgentOutput, BudgetStatus


class RiskAgentOutput(BaseModel):
    """Structured output from Risk Agent."""
    risk_summary: str = Field(..., description="High-level explanation of release risk drivers")
    contributing_factors: list[str] = Field(default_factory=list, description="Ranked list of factors driving the score")
    historical_evidence: list[str] = Field(default_factory=list, description="Evidence derived strictly from actual historical records")
    data_limitations: list[str] = Field(default_factory=list, description="Identified gaps in telemetry or historical observations")
    dominant_factor: Optional[str] = Field(None, description="Name of highest contributing factor")


def evaluate_release_risk(
    *,
    risk_score: float,
    recommendation: str,
    risk_factors: list[dict[str, Any]],
    budget_agent_output: BudgetAgentOutput,
    release_history: Optional[list[dict[str, Any]]] = None,
    service_metrics: Optional[dict[str, Any]] = None,
) -> RiskAgentOutput:
    """
    Deterministic interpretation of release risk contributors.

    Guarantees:
    - Backend risk_score and recommendation are the sole ground truth.
    - Factors sorted and cited with exact contribution weights.
    - Historical evidence cited ONLY if actual records are supplied.
    - Distinguishes observed metrics from assumptions and missing data.
    """
    contributing_factors: list[str] = []
    historical_evidence: list[str] = []
    data_limitations: list[str] = []

    # 1. Rank risk factors by contribution points
    sorted_factors = sorted(
        risk_factors,
        key=lambda x: float(x.get("contribution", 0.0)),
        reverse=True,
    )

    dominant_factor_name = None
    if sorted_factors:
        dominant_factor_name = sorted_factors[0].get("name")
        for factor in sorted_factors:
            contribution = float(factor.get("contribution", 0.0))
            name = factor.get("name", "Unknown factor")
            desc = factor.get("description", "")
            if contribution > 0:
                contributing_factors.append(f"{name} (+{contribution:.1f} pts): {desc}")

    if not contributing_factors:
        contributing_factors.append("All individual risk factors evaluated at 0 points (nominal).")

    # 2. Correlate with historical data if actual records exist
    history = release_history or []
    if history:
        total_historical = len(history)
        incident_causing = [r for r in history if r.get("caused_incident")]
        incident_count = len(incident_causing)
        pct = (incident_count / total_historical * 100.0) if total_historical > 0 else 0.0
        historical_evidence.append(
            f"Observed {total_historical} historical releases for this service: "
            f"{incident_count} ({pct:.1f}%) resulted in an incident."
        )

        # Check if current change size historically caused issues
        current_size = (service_metrics or {}).get("change_size")
        if current_size:
            same_size_incidents = [
                r for r in incident_causing if str(r.get("change_size", "")).lower() == str(current_size).lower()
            ]
            if same_size_incidents:
                historical_evidence.append(
                    f"{len(same_size_incidents)} past incident(s) were associated with '{current_size}' changes."
                )
    else:
        data_limitations.append("No historical release records provided; risk model relies solely on instantaneous telemetry.")

    # 3. Check for telemetry limitations
    metrics = service_metrics or {}
    if "files_changed" not in metrics:
        data_limitations.append("Code change volume (files changed) was not provided.")
    if "recent_incidents_30d" not in metrics:
        data_limitations.append("Recent 30-day incident frequency was omitted.")

    # 4. Formulate risk summary
    rec_upper = recommendation.upper()
    if rec_upper == "WAIT":
        if budget_agent_output.status == BudgetStatus.EXHAUSTED:
            risk_summary = (
                f"Release risk is critical (score {risk_score:.1f}/100): "
                f"the error budget is exhausted and {dominant_factor_name or 'overall instability'} poses immediate deployment hazard."
            )
        else:
            risk_summary = (
                f"Release risk is elevated (score {risk_score:.1f}/100): "
                f"primary driver is {dominant_factor_name or 'composite telemetry factors'} exceeding safe operating boundaries."
            )
    elif rec_upper == "GO_WITH_SAFE_GUARD":
        risk_summary = (
            f"Release risk is moderate (score {risk_score:.1f}/100): "
            f"safe to proceed provided mitigations address {dominant_factor_name or 'identified telemetry variances'}."
        )
    else:
        risk_summary = (
            f"Release risk is low (score {risk_score:.1f}/100): "
            "all monitored telemetry and factor weights reside safely within nominal thresholds."
        )

    return RiskAgentOutput(
        risk_summary=risk_summary,
        contributing_factors=contributing_factors,
        historical_evidence=historical_evidence,
        data_limitations=data_limitations,
        dominant_factor=dominant_factor_name,
    )
