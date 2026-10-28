"""
orchestrator.py — Orchestrates Budget Agent, Risk Agent, and Explanation Agent.

Coordinates the 3-module agent workflow sequentially:
1. Receives deterministic backend analysis.
2. Runs Budget Agent on budget information.
3. Runs Risk Agent on risk analysis and available release history.
4. Passes both results to the Explanation Agent (with optional ChromaDB policy context).
5. Returns structured explanation and mitigation fields for backend integration.
"""
from __future__ import annotations

import logging
from typing import Any, Optional
from pydantic import BaseModel, Field

from ai.budget_agent import BudgetAgentOutput, evaluate_budget_condition
from ai.risk_agent import RiskAgentOutput, evaluate_release_risk
from ai.explanation_agent import ExplanationAgentOutput, generate_explanation
from ai.retrieval import retrieve_relevant_policies, is_retrieval_active

logger = logging.getLogger("releaseguard.orchestrator")


class OrchestratorResult(BaseModel):
    """Integrated structured output from the 3-agent orchestration."""
    risk_score: float = Field(..., description="Authoritative deterministic risk score from backend")
    recommendation: str = Field(..., description="Authoritative recommendation from backend (GO, GO_WITH_SAFE_GUARD, WAIT)")
    explanation: str = Field(..., description="SRE-grade decision explanation")
    mitigations: list[str] = Field(..., description="Actionable mitigation steps")
    deployment_timing_advice: str = Field(..., description="Calendar timing advice")
    confidence_note: str = Field(..., description="Confidence and limitations note")
    budget_analysis: BudgetAgentOutput = Field(..., description="Full structured evaluation from Budget Agent")
    risk_analysis: RiskAgentOutput = Field(..., description="Full structured evaluation from Risk Agent")
    is_fallback: bool = Field(default=False, description="Whether fallback explanation was used")
    model_name: str = Field(default="deterministic-rule-fallback", description="Model name or fallback identifier")
    retrieved_policies_count: int = Field(default=0, description="Number of policy documents retrieved via RAG")


def orchestrate_release_analysis(
    *,
    deterministic_analysis: dict[str, Any],
    context: Optional[dict[str, Any]] = None,
    release_history: Optional[list[dict[str, Any]]] = None,
    deployment_calendar: Optional[dict[str, Any]] = None,
    provider: Optional[str] = None,
    model: Optional[str] = None,
    enable_rag: bool = True,
) -> OrchestratorResult:
    """
    Execute the three-module agent workflow in sequential order.

    Parameters
    ----------
    deterministic_analysis : dict
        Analysis from risk_engine.analyze_release. Must contain 'risk_score',
        'recommendation', 'error_budget', 'risk_factors', 'summary'.
    context : Optional[dict]
        Release parameters: service_name, change_size, files_changed,
        error_rate_percent, latency_ms, latency_threshold_ms,
        recent_incidents_30d, release_notes, measurement_window.
    release_history : Optional[list[dict]]
        Historical releases for this service from data_service.
    deployment_calendar : Optional[dict]
        Calendar evaluation info from data_service.check_deployment_timing.
    provider : Optional[str]
        Force specific LLM provider: 'gemini', 'openai', 'fallback', or 'auto'.
    model : Optional[str]
        LLM model override.
    enable_rag : bool
        Whether to query ChromaDB for policy guidelines.

    Returns
    -------
    OrchestratorResult
        Coordinated result with budget analysis, risk analysis, and SRE explanation.
    """
    ctx = context or {}

    # Extract deterministic backend invariants
    risk_score = float(deterministic_analysis.get("risk_score", 0.0))
    recommendation = str(deterministic_analysis.get("recommendation", "WAIT"))

    error_budget = deterministic_analysis.get("error_budget", {})
    risk_factors = deterministic_analysis.get("risk_factors", [])

    # -----------------------------------------------------------------------
    # Step 1: Run Budget Agent (Deterministic)
    # -----------------------------------------------------------------------
    budget_output = evaluate_budget_condition(
        slo_target=error_budget.get("slo_target"),
        observed_availability=error_budget.get("observed_availability"),
        budget_consumed_percent=error_budget.get("budget_consumed_percent"),
        remaining_budget_percent=error_budget.get("remaining_budget_percent"),
        measurement_window=ctx.get("measurement_window"),
        policy_context=ctx.get("policy_context"),
    )

    # -----------------------------------------------------------------------
    # Step 2: Run Risk Agent (Deterministic)
    # -----------------------------------------------------------------------
    risk_output = evaluate_release_risk(
        risk_score=risk_score,
        recommendation=recommendation,
        risk_factors=risk_factors,
        budget_agent_output=budget_output,
        release_history=release_history,
        service_metrics=ctx,
    )

    # -----------------------------------------------------------------------
    # Step 3: Optional Policy Retrieval (RAG via ChromaDB)
    # -----------------------------------------------------------------------
    retrieved_docs: list[dict[str, Any]] = []
    if enable_rag and is_retrieval_active():
        # Build query based on recommendation and dominant risk factor
        query = f"policy for {recommendation} release {risk_output.dominant_factor or 'error budget'}"
        retrieved_docs = retrieve_relevant_policies(query=query, top_k=2)

    # -----------------------------------------------------------------------
    # Step 4: Run Explanation Agent (LLM with Fallback)
    # -----------------------------------------------------------------------
    cal_data = deployment_calendar or {}
    if not cal_data and "timing_advice" in deterministic_analysis:
        cal_data = {"advice": deterministic_analysis.get("timing_advice")}

    explanation_output = generate_explanation(
        risk_score=risk_score,
        recommendation=recommendation,
        budget_analysis=budget_output,
        risk_analysis=risk_output,
        deployment_calendar_data=cal_data,
        retrieved_policy_documents=retrieved_docs,
        user_release_notes=ctx.get("release_notes"),
        provider=provider,
        model=model,
    )

    return OrchestratorResult(
        risk_score=risk_score,
        recommendation=recommendation,
        explanation=explanation_output.explanation,
        mitigations=explanation_output.mitigations,
        deployment_timing_advice=explanation_output.deployment_timing_advice,
        confidence_note=explanation_output.confidence_note,
        budget_analysis=budget_output,
        risk_analysis=risk_output,
        is_fallback=explanation_output.is_fallback,
        model_name=explanation_output.model_name,
        retrieved_policies_count=len(retrieved_docs),
    )
