"""
budget_agent.py — Agent 1: Explains the service's current SLO/error-budget condition.

Uses deterministic Python functions and backend calculations rather than
recomputing the budget or calling an expensive LLM.
"""
from __future__ import annotations

from enum import Enum
from typing import Any, Optional
from pydantic import BaseModel, Field


class BudgetStatus(str, Enum):
    HEALTHY = "HEALTHY"
    LOW = "LOW"
    EXHAUSTED = "EXHAUSTED"
    INSUFFICIENT_DATA = "INSUFFICIENT_DATA"


class BudgetAgentOutput(BaseModel):
    """Structured output from Budget Agent."""
    status: BudgetStatus = Field(..., description="Classification: HEALTHY, LOW, EXHAUSTED, or INSUFFICIENT_DATA")
    summary: str = Field(..., description="High-level human-readable verdict on error budget health")
    evidence: list[str] = Field(default_factory=list, description="Concrete evidence drawn directly from supplied metrics")
    warnings: list[str] = Field(default_factory=list, description="Warnings or limitations regarding missing telemetry")
    remaining_budget_percent: Optional[float] = Field(None, description="Reported remaining budget percentage if defined")
    budget_consumed_percent: Optional[float] = Field(None, description="Reported budget consumed percentage if defined")


def evaluate_budget_condition(
    *,
    slo_target: Optional[float],
    observed_availability: Optional[float],
    budget_consumed_percent: Optional[float],
    remaining_budget_percent: Optional[float],
    measurement_window: Optional[str] = None,
    policy_context: Optional[dict[str, Any] | str] = None,
) -> BudgetAgentOutput:
    """
    Deterministic evaluation of the service error budget condition.

    Guarantees:
    - Never recomputes budget independently; uses authoritative backend calculations.
    - Accurately classifies status: HEALTHY, LOW, EXHAUSTED, or INSUFFICIENT_DATA.
    - Handles undefined budget (e.g. 100% SLO) cleanly without inventing percentages.
    - Highlights data limitations (e.g. unverified rolling window).
    """
    evidence: list[str] = []
    warnings: list[str] = []

    # 1. Check for insufficient data
    if slo_target is None or observed_availability is None:
        warnings.append("SLO target or observed availability metric was omitted or null.")
        return BudgetAgentOutput(
            status=BudgetStatus.INSUFFICIENT_DATA,
            summary="Cannot assess error budget condition due to missing availability telemetry.",
            evidence=evidence,
            warnings=warnings,
            remaining_budget_percent=remaining_budget_percent,
            budget_consumed_percent=budget_consumed_percent,
        )

    # 2. Check measurement window transparency
    if not measurement_window:
        warnings.append("Measurement window was not specified; rolling window assumption must be verified.")
    else:
        evidence.append(f"Observation window: {measurement_window}.")

    # 3. Handle undefined budget edge-case (e.g., 100% SLO with 0 allowed downtime)
    if slo_target >= 100.0:
        if observed_availability < 100.0:
            evidence.append(
                f"SLO target is 100.0% with zero allowed downtime. Observed availability is {observed_availability:.4f}%."
            )
            warnings.append("A 100% SLO allows no error margin; any downtime constitutes immediate budget exhaustion.")
            return BudgetAgentOutput(
                status=BudgetStatus.EXHAUSTED,
                summary="Error budget is exhausted under an absolute 100% zero-tolerance SLO.",
                evidence=evidence,
                warnings=warnings,
                remaining_budget_percent=0.0,
                budget_consumed_percent=100.0,
            )
        else:
            evidence.append("Observed availability is 100.0% against a 100% SLO target.")
            warnings.append("Zero error tolerance exists: a single failed request will breach SLO.")
            return BudgetAgentOutput(
                status=BudgetStatus.LOW,
                summary="Availability is currently 100%, but a 100% target offers no safety buffer.",
                evidence=evidence,
                warnings=warnings,
                remaining_budget_percent=100.0,
                budget_consumed_percent=0.0,
            )

    # 4. Normal numeric evaluation using backend supplied figures
    remaining = remaining_budget_percent if remaining_budget_percent is not None else (100.0 - (budget_consumed_percent or 0.0))
    consumed = budget_consumed_percent if budget_consumed_percent is not None else (100.0 - remaining)

    evidence.append(f"SLO target is {slo_target:.2f}%; observed availability is {observed_availability:.4f}%.")
    evidence.append(f"The supplied analysis reports {consumed:.1f}% budget consumed ({remaining:.1f}% remaining).")

    if policy_context:
        if isinstance(policy_context, dict):
            tier = policy_context.get("criticality") or policy_context.get("tier")
            if tier:
                evidence.append(f"Service tier policy: '{tier}'.")
        elif isinstance(policy_context, str):
            evidence.append(f"Policy note: {policy_context}.")

    # 5. Classify status
    if remaining <= 0.0 or observed_availability < slo_target:
        status = BudgetStatus.EXHAUSTED
        summary = (
            f"Error budget is fully exhausted ({remaining:.1f}% remaining). "
            f"Service is operating below or at the threshold of its {slo_target:.2f}% SLO."
        )
        warnings.append("Deployments under exhausted error budgets carry severe risk of SLA violation.")
    elif remaining <= 25.0:
        status = BudgetStatus.LOW
        summary = f"Error budget is dangerously low with only {remaining:.1f}% remaining."
        warnings.append("Low budget margin limits recovery room if the deployment introduces unexpected regressions.")
    else:
        status = BudgetStatus.HEALTHY
        summary = f"Error budget is healthy with {remaining:.1f}% remaining margin."

    return BudgetAgentOutput(
        status=status,
        summary=summary,
        evidence=evidence,
        warnings=warnings,
        remaining_budget_percent=round(remaining, 2),
        budget_consumed_percent=round(consumed, 2),
    )
