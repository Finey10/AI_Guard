"""
frontend_connector.py — Formats and validates AI Agent output for the Next.js dashboard.

Ensures 100% compliance with frontend/src/lib/types.ts:
- risk_score: float
- remaining_budget_percent: float
- budget_consumed_percent: float
- recommendation: 'GO' | 'GO_WITH_SAFE_GUARD' | 'WAIT'
- risk_factors: list[RiskFactor]
- explanation: string
- mitigations: list[string]
- deployment_timing_advice: string
- suggested_windows: list[SuggestedWindow]
"""
from __future__ import annotations

from typing import Any, Optional
from pydantic import BaseModel, Field


class FrontendRiskFactor(BaseModel):
    name: str
    impact: str = "medium"  # 'low' | 'medium' | 'high' | 'critical' | 'positive'
    weight: float = 0.0
    description: str
    is_ai_generated: bool = False


class FrontendSuggestedWindow(BaseModel):
    window: str
    risk_level: str  # 'low' | 'medium' | 'high'
    label: str
    is_simulated: bool = True


class FrontendReleaseAnalysisResponse(BaseModel):
    """Payload matching Next.js frontend ReleaseAnalysisResponse interface."""
    risk_score: float
    remaining_budget_percent: float
    budget_consumed_percent: float
    recommendation: str  # 'GO' | 'GO_WITH_SAFE_GUARD' | 'WAIT'
    risk_factors: list[FrontendRiskFactor] = Field(default_factory=list)
    explanation: str
    mitigations: list[str] = Field(default_factory=list)
    deployment_timing_advice: str
    suggested_windows: list[FrontendSuggestedWindow] = Field(default_factory=list)

    error_budget: Optional[dict[str, Any]] = None
    decision_alias: Optional[str] = None
    ai_advisor: Optional[dict[str, Any]] = None

    # Optional governance metadata
    is_ai_generated: bool = True
    ai_confidence_note: Optional[str] = None
    ai_status: Optional[str] = None


def _map_impact(contribution: float) -> str:
    """Map numeric risk contribution to frontend impact category."""
    if contribution >= 20.0:
        return "critical"
    elif contribution >= 10.0:
        return "high"
    elif contribution >= 5.0:
        return "medium"
    return "low"


def format_for_frontend(
    *,
    deterministic_analysis: dict[str, Any],
    orchestrator_result: Any,
) -> dict[str, Any]:
    """
    Format orchestrator output and deterministic backend analysis into the exact
    JSON payload expected by the frontend dashboard.
    """
    error_budget = deterministic_analysis.get("error_budget", {})
    rem_budget = float(error_budget.get("remaining_budget_percent", 100.0))
    con_budget = float(error_budget.get("budget_consumed_percent", 0.0))

    raw_factors = deterministic_analysis.get("risk_factors", [])
    frontend_factors: list[dict[str, Any]] = []

    for f in raw_factors:
        contrib = float(f.get("contribution", 0.0))
        frontend_factors.append({
            "name": f.get("name", "Unknown Factor"),
            "impact": _map_impact(contrib),
            "weight": contrib,
            "description": f.get("description", ""),
            "is_ai_generated": False,
        })

    # Add AI budget agent insight factor
    if hasattr(orchestrator_result, "budget_analysis"):
        b_analysis = orchestrator_result.budget_analysis
        frontend_factors.append({
            "name": f"AI Budget Analysis ({b_analysis.status.value})",
            "impact": "critical" if b_analysis.status.value == "EXHAUSTED" else "low",
            "weight": 0.0,
            "description": b_analysis.summary,
            "is_ai_generated": True,
        })

    suggested_windows = [
        {"window": "Tuesday 09:00 - 12:00 UTC", "risk_level": "low", "label": "Low Traffic Window", "is_simulated": True},
        {"window": "Wednesday 09:00 - 12:00 UTC", "risk_level": "low", "label": "Mid-week Stable Window", "is_simulated": True},
    ]

    response = FrontendReleaseAnalysisResponse(
        risk_score=float(deterministic_analysis.get("risk_score", 0.0)),
        remaining_budget_percent=round(rem_budget, 2),
        budget_consumed_percent=round(con_budget, 2),
        recommendation=str(deterministic_analysis.get("recommendation", "WAIT")),
        risk_factors=[FrontendRiskFactor(**f) for f in frontend_factors],
        explanation=orchestrator_result.explanation,
        mitigations=orchestrator_result.mitigations,
        deployment_timing_advice=orchestrator_result.deployment_timing_advice,
        suggested_windows=[FrontendSuggestedWindow(**w) for w in suggested_windows],
        error_budget=error_budget,
        decision_alias="DEPLOY" if deterministic_analysis.get("recommendation") == "GO" else ("MONITOR" if deterministic_analysis.get("recommendation") == "GO_WITH_SAFE_GUARD" else "HOLD"),
        ai_advisor={
            "anti_gaming_note": "Deterministic mathematical weights for SLO consumption, latency thresholds, and calendar rules strictly govern the score.",
            "model_name": getattr(orchestrator_result, "model_name", "deterministic-rule-fallback"),
            "is_fallback": getattr(orchestrator_result, "is_fallback", True),
            "developer_guidance": "Standard operational procedures apply." if deterministic_analysis.get("recommendation") == "GO" else "Engage SRE lead for exception review if overriding.",
        },
        is_ai_generated=not getattr(orchestrator_result, "is_fallback", False),
        ai_confidence_note=getattr(orchestrator_result, "confidence_note", None),
        ai_status="active",
    )

    return response.model_dump()
