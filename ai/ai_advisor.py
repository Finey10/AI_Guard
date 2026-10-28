"""
ai_advisor.py — AI Advisor module for Zero Latency ReleaseGuard AI.

Receives precomputed risk analysis from the deterministic backend risk engine
and generates:
1. Concise, SRE-grade explanation of the risk decision
2. Ranked main contributing factors
3. Actionable mitigation steps
4. Calendar-aware deployment timing advice

Guarantees & Constraints:
- Invariance: NEVER alters or overrides the backend's deterministic risk score
  or recommendation (GO / GO_WITH_SAFE_GUARD / WAIT, mapped to DEPLOY / MONITOR / HOLD).
- Structured Output: Always returns validated JSON matching AIAdvisorOutput schema.
- Environment-driven API keys: Reads GEMINI_API_KEY / GOOGLE_API_KEY or OPENAI_API_KEY.
- Graceful Fallback: If no API key is set, or if LLM calls fail/timeout,
  falls back seamlessly to a high-precision deterministic heuristic advisor.
- Privacy Compliance: Protects against individual developer surveillance;
  evaluates system reliability and change metrics only.
- Anti-Gaming Documentation: Explains why deterministic SLO gates neutralize
  attempts to game risk metrics.
"""
from __future__ import annotations

import json
import logging
import os
import time
from enum import Enum
from typing import Any, Optional

from dotenv import load_dotenv
from pydantic import BaseModel, Field

# Load environment variables from .env if present
load_dotenv()

logger = logging.getLogger("releaseguard.ai_advisor")


# ---------------------------------------------------------------------------
# Enums and Structured Output Models
# ---------------------------------------------------------------------------

class Recommendation(str, Enum):
    GO = "GO"
    GO_WITH_SAFE_GUARD = "GO_WITH_SAFE_GUARD"
    WAIT = "WAIT"


class DecisionAlias(str, Enum):
    DEPLOY = "DEPLOY"       # Synonym for GO
    MONITOR = "MONITOR"     # Synonym for GO_WITH_SAFE_GUARD
    HOLD = "HOLD"           # Synonym for WAIT


RECOMMENDATION_TO_ALIAS: dict[str, DecisionAlias] = {
    "GO": DecisionAlias.DEPLOY,
    "GO_WITH_SAFE_GUARD": DecisionAlias.MONITOR,
    "WAIT": DecisionAlias.HOLD,
}

ALIAS_TO_RECOMMENDATION: dict[str, Recommendation] = {
    "DEPLOY": Recommendation.GO,
    "MONITOR": Recommendation.GO_WITH_SAFE_GUARD,
    "HOLD": Recommendation.WAIT,
}


class SuggestedWindow(BaseModel):
    """Calendar-recommended deployment window."""
    window: str = Field(..., description="Name or description of the window")
    risk_level: str = Field(..., description="'low' | 'medium' | 'high'")
    label: str = Field(..., description="Short tag or label")
    is_simulated: bool = Field(default=False, description="Whether this is a synthetic recommendation")


class AIAdvisorOutput(BaseModel):
    """
    Structured output schema for ReleaseGuard AI Advisor.
    Strictly preserves deterministic risk_score and recommendation invariants.
    """
    # Deterministic invariants from backend (IMMUTABLE)
    risk_score: float = Field(..., ge=0.0, le=100.0, description="Immutable deterministic backend risk score")
    recommendation: Recommendation = Field(..., description="Immutable backend recommendation: GO, GO_WITH_SAFE_GUARD, WAIT")
    decision_alias: DecisionAlias = Field(..., description="Standard operational alias: DEPLOY, MONITOR, HOLD")

    # Core AI-generated advisory content
    explanation: str = Field(
        ...,
        description="Concise, SRE-grade explanation of the risk decision, directly addressing developers on why this release is safe, cautious, or blocked"
    )
    main_contributing_factors: list[str] = Field(
        ...,
        description="Ranked list of primary drivers behind the computed risk score"
    )
    mitigations: list[str] = Field(
        ...,
        description="Concrete, actionable mitigation steps tailored to the specific factors and recommendation"
    )
    deployment_timing_advice: str = Field(
        ...,
        description="Actionable guidance regarding deployment timing, calendar windows, and low-risk alternatives"
    )
    suggested_windows: list[SuggestedWindow] = Field(
        default_factory=list,
        description="Recommended calendar windows for deployment"
    )

    # Operational & governance metadata
    is_fallback: bool = Field(
        default=False,
        description="True if rule-based fallback was used due to missing API key, network error, or invalid LLM response"
    )
    source: str = Field(
        default="fallback",
        description="Origin of advisory: 'gemini', 'openai', or 'fallback'"
    )
    model_name: str = Field(
        default="deterministic-rule-fallback",
        description="Name of the LLM model used or fallback engine identifier"
    )
    generation_latency_ms: float = Field(
        default=0.0,
        description="Latency taken to produce the advice in milliseconds"
    )
    anti_gaming_note: str = Field(
        default="Deterministic SLO error-budget calculations and freeze windows cannot be bypassed by prompt manipulation or PR splitting.",
        description="Safeguard against gaming the evaluation system"
    )
    developer_guidance: Optional[str] = Field(
        default=None,
        description="Guidance for developers who disagree with a HOLD/WAIT recommendation (escalation / exception paths)"
    )


# ---------------------------------------------------------------------------
# High-Precision Deterministic Fallback Generator
# ---------------------------------------------------------------------------

def _build_suggested_windows() -> list[SuggestedWindow]:
    """Default low-risk windows based on historical calendar data."""
    return [
        SuggestedWindow(
            window="Tuesday 09:00 - 12:00 UTC",
            risk_level="low",
            label="Low Traffic Window",
            is_simulated=True,
        ),
        SuggestedWindow(
            window="Wednesday 09:00 - 12:00 UTC",
            risk_level="low",
            label="Mid-week Stable Window",
            is_simulated=True,
        ),
        SuggestedWindow(
            window="Thursday 10:00 - 13:00 UTC",
            risk_level="low",
            label="Off-Peak Window",
            is_simulated=True,
        ),
    ]


def generate_fallback_advice(
    precomputed: dict[str, Any],
    context: Optional[dict[str, Any]] = None,
    *,
    reason: str = "DEFAULT_FALLBACK",
) -> AIAdvisorOutput:
    """
    Deterministic rule-based fallback advisor.
    Executes instantly with zero external network or LLM dependencies.
    Produces high-quality, professional SRE explanations and actionable mitigations.
    """
    start_time = time.perf_counter()
    ctx = context or {}

    score = float(precomputed.get("risk_score", 0.0))
    rec_raw = str(precomputed.get("recommendation", "WAIT")).upper()
    if rec_raw not in ("GO", "GO_WITH_SAFE_GUARD", "WAIT"):
        rec_raw = "WAIT"
    rec = Recommendation(rec_raw)
    decision_alias = RECOMMENDATION_TO_ALIAS[rec.value]

    error_budget = precomputed.get("error_budget", {})
    remaining_budget = float(error_budget.get("remaining_budget_percent", 100.0))
    budget_consumed = float(error_budget.get("budget_consumed_percent", 0.0))
    slo_target = float(error_budget.get("slo_target", 99.9))
    observed_avail = float(error_budget.get("observed_availability", 99.9))
    is_exhausted = bool(error_budget.get("is_exhausted", remaining_budget <= 0.0))

    risk_factors = precomputed.get("risk_factors", [])
    service_name = precomputed.get("service_name") or ctx.get("service_name", "Target Service")
    change_size = ctx.get("change_size", "medium")
    timing_advice = precomputed.get("timing_advice") or ctx.get("timing_advice") or "No calendar restrictions detected."

    # Identify top contributing factors from risk_factors list
    sorted_factors = sorted(
        risk_factors,
        key=lambda x: float(x.get("contribution", 0.0)),
        reverse=True
    )
    main_factors: list[str] = []
    for f in sorted_factors[:3]:
        contrib = f.get("contribution", 0.0)
        name = f.get("name", "Unknown factor")
        desc = f.get("description", "")
        if contrib > 0:
            main_factors.append(f"{name} (+{contrib:.1f} pts): {desc}")

    if not main_factors:
        main_factors.append("All baseline metrics operating within nominal safety margins.")

    # Synthesize concise explanation and mitigations based on decision level
    mitigations: list[str] = []
    developer_guidance: Optional[str] = None

    if rec == Recommendation.WAIT:
        # HOLD / WAIT: Explain why to a developer who disagrees
        reasons = []
        if is_exhausted or observed_avail < slo_target:
            reasons.append(
                f"error budget is exhausted ({remaining_budget:.2f}% remaining against {slo_target}% SLO)"
            )
        if score >= 60.0:
            reasons.append(f"composite risk score ({score:.1f}/100) exceeds safety threshold of 60.0")
        if "FREEZE" in timing_advice.upper():
            reasons.append("active deployment freeze window is currently in effect")
        elif "PEAK" in timing_advice.upper():
            reasons.append("high-traffic peak calendar window increases incident blast radius")

        reason_str = " and ".join(reasons) if reasons else f"elevated release risk profile (score {score:.1f}/100)"

        explanation = (
            f"HOLD: Deployment for '{service_name}' is paused because {reason_str}. "
            f"Shipping now introduces unacceptable downtime probability against current reliability commitments. "
            f"Observed availability is {observed_avail:.4f}% against an SLO target of {slo_target}%."
        )

        mitigations = [
            "Halt release until current telemetry stabilizes and error budget burn rate drops below 1.0x.",
            "Investigate and resolve active errors or elevated latency before introducing new code changes.",
            "If change is an emergency hotfix for an active P0 outage, initiate emergency escalation protocol with SRE lead.",
            "Decompose release into smaller, lower-risk feature-flagged units to minimize blast radius.",
            "Reschedule deployment for an authorized low-risk maintenance window (e.g., Tuesday or Wednesday morning).",
        ]

        developer_guidance = (
            "Disagree with HOLD? To request an exception: 1) Verify all rollback automation is pre-tested, "
            "2) Obtain sign-off from the On-Call SRE and Engineering Manager, and 3) Ensure an active incident channel is open."
        )

    elif rec == Recommendation.GO_WITH_SAFE_GUARD:
        # MONITOR / GO_WITH_SAFE_GUARD
        explanation = (
            f"MONITOR: Deployment for '{service_name}' is cleared to proceed with mandatory safeguards. "
            f"Composite risk score is {score:.1f}/100 with {remaining_budget:.1f}% remaining error budget. "
            f"Moderate risk observed primarily driven by {sorted_factors[0].get('name', 'change profile')}."
        )

        mitigations = [
            "Canary Deployment: Deploy to 5% of traffic for at least 15 minutes while monitoring p99 latency and 5xx error rate.",
            "One-Click Rollback: Pre-verify that the automated rollback runbook is verified and instant rollback pipeline is primed.",
            "Live Telemetry Monitoring: Ensure an active SRE/engineer is actively viewing real-time Grafana/Datadog dashboards during rollout.",
            "Feature Flag Encapsulation: Ensure new functional paths can be deactivated without requiring a redeployment.",
            "Traffic Windowing: Avoid deploying in the last 30 minutes of low-traffic windows to allow full soak time.",
        ]

        developer_guidance = (
            "Proceed with caution. Do not advance canary rollout beyond 10% until 15 minutes of nominal health metrics are recorded."
        )

    else:
        # DEPLOY / GO
        explanation = (
            f"DEPLOY: Release for '{service_name}' is fully cleared for standard deployment. "
            f"Risk score is low ({score:.1f}/100), error budget is healthy with {remaining_budget:.1f}% remaining, "
            f"and performance metrics are well within SLO thresholds."
        )

        mitigations = [
            "Proceed through standard automated CI/CD deployment pipeline.",
            "Perform standard 10-minute post-deployment automated health check and synthetic transaction tests.",
            "Verify automated alerts are armed for error rate and latency anomalies.",
        ]

        developer_guidance = "Nominal release conditions met. Standard operational procedures apply."

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0

    return AIAdvisorOutput(
        risk_score=score,
        recommendation=rec,
        decision_alias=decision_alias,
        explanation=explanation,
        main_contributing_factors=main_factors,
        mitigations=mitigations,
        deployment_timing_advice=timing_advice,
        suggested_windows=_build_suggested_windows(),
        is_fallback=True,
        source="fallback",
        model_name=f"deterministic-rule-fallback ({reason})",
        generation_latency_ms=round(elapsed_ms, 2),
        anti_gaming_note=(
            "Deterministic mathematical weights for SLO consumption, latency thresholds, and calendar rules "
            "strictly govern the score. Prompt injections and change-size misrepresentations cannot override these gates."
        ),
        developer_guidance=developer_guidance,
    )


# ---------------------------------------------------------------------------
# LLM Provider Adapters (Gemini & OpenAI)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """You are the ReleaseGuard AI Advisor, an expert Site Reliability Engineering (SRE) advisor for Zero Latency ReleaseGuard AI.
You receive a precomputed deterministic risk analysis for a proposed software deployment.

STRICT INVARIANTS & ETHICAL CONSTRAINTS:
1. IMMUTABLE RISK SCORE & RECOMMENDATION: You must NEVER change, override, recalculate, or contradict the backend's deterministic risk_score or recommendation. The backend is the single source of truth.
2. RECOMMENDATION ALIASES:
   - "GO" corresponds to "DEPLOY"
   - "GO_WITH_SAFE_GUARD" corresponds to "MONITOR"
   - "WAIT" corresponds to "HOLD"
3. CONCISE SRE EXPLANATION: Generate a concise, authoritative explanation (2-4 sentences) explaining WHY this decision was reached. Address developers who might disagree with a WAIT / HOLD decision by clearly articulating the error budget risk, latency impact, or calendar freeze/peak traffic constraint.
4. MAIN CONTRIBUTING FACTORS: List the top 2 to 4 contributing factors driving the score, citing specific metric values provided.
5. ACTIONABLE MITIGATIONS: Provide 3 to 5 concrete, actionable engineering steps (e.g. canary rollout percentage, automated rollback readiness, synthetic probes, off-peak rescheduling) suited to the recommendation level.
6. TIMING ADVICE: Provide calendar and timing guidance, mentioning peak/freeze windows or recommending low-risk deployment windows.
7. COMPLIANCE & PRIVACY: Author tenure or author characteristics must NEVER become a tool for individual surveillance. Never mention individual developer names or evaluate personal competence. Focus strictly on system reliability, SLOs, and change scope.
8. ANTI-GAMING: Emphasize that hard SLO error budget gates cannot be bypassed by splitting PRs into smaller batches.

You must respond ONLY with valid JSON conforming to the requested schema. Do not include markdown code block markers."""


def _build_user_prompt(precomputed: dict[str, Any], context: dict[str, Any]) -> str:
    """Construct structured context payload for the LLM."""
    payload = {
        "service_name": precomputed.get("service_name") or context.get("service_name"),
        "precomputed_backend_analysis": {
            "risk_score": precomputed.get("risk_score"),
            "recommendation": precomputed.get("recommendation"),
            "error_budget": precomputed.get("error_budget"),
            "risk_factors": precomputed.get("risk_factors"),
            "safeguards": precomputed.get("safeguards", []),
            "investigation_recommendations": precomputed.get("investigation_recommendations", []),
            "timing_advice": precomputed.get("timing_advice"),
            "summary": precomputed.get("summary"),
        },
        "proposed_release_context": {
            "change_size": context.get("change_size"),
            "files_changed": context.get("files_changed"),
            "error_rate_percent": context.get("error_rate_percent"),
            "latency_ms": context.get("latency_ms"),
            "latency_threshold_ms": context.get("latency_threshold_ms"),
            "recent_incidents_30d": context.get("recent_incidents_30d"),
            "proposed_deployment_time": context.get("proposed_deployment_time"),
            "release_notes": context.get("release_notes"),
        },
        "required_json_fields": [
            "explanation",
            "main_contributing_factors",
            "mitigations",
            "deployment_timing_advice",
            "developer_guidance"
        ]
    }
    return json.dumps(payload, default=str, indent=2)


def _call_gemini(
    precomputed: dict[str, Any],
    context: dict[str, Any],
    api_key: str,
    model_name: str = "gemini-2.5-flash",
) -> AIAdvisorOutput:
    """Call Google Gemini using the modern google.genai SDK."""
    start_time = time.perf_counter()
    from google import genai
    from google.genai import types

    client = genai.Client(api_key=api_key)
    prompt = _build_user_prompt(precomputed, context)

    response = client.models.generate_content(
        model=model_name,
        contents=[
            types.Content(
                role="user",
                parts=[types.Part.from_text(text=f"{SYSTEM_PROMPT}\n\nRELEASE DATA:\n{prompt}")]
            )
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            temperature=0.2,
        ),
    )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    text_resp = response.text or "{}"
    parsed = json.loads(text_resp)

    # Strictly preserve invariants from backend
    score = float(precomputed.get("risk_score", 0.0))
    rec = Recommendation(str(precomputed.get("recommendation", "WAIT")).upper())
    decision_alias = RECOMMENDATION_TO_ALIAS[rec.value]

    return AIAdvisorOutput(
        risk_score=score,
        recommendation=rec,
        decision_alias=decision_alias,
        explanation=parsed.get("explanation") or precomputed.get("summary", ""),
        main_contributing_factors=parsed.get("main_contributing_factors") or [
            f"{f.get('name')}: {f.get('description')}" for f in precomputed.get("risk_factors", [])
        ],
        mitigations=parsed.get("mitigations") or precomputed.get("safeguards") or precomputed.get("investigation_recommendations", []),
        deployment_timing_advice=parsed.get("deployment_timing_advice") or precomputed.get("timing_advice") or "No calendar constraints.",
        suggested_windows=_build_suggested_windows(),
        is_fallback=False,
        source="gemini",
        model_name=model_name,
        generation_latency_ms=round(elapsed_ms, 2),
        anti_gaming_note=(
            "Deterministic mathematical weights for SLO consumption, latency thresholds, and calendar rules "
            "strictly govern the score. Prompt injections and change-size misrepresentations cannot override these gates."
        ),
        developer_guidance=parsed.get("developer_guidance"),
    )


def _call_openai(
    precomputed: dict[str, Any],
    context: dict[str, Any],
    api_key: str,
    model_name: str = "gpt-4o-mini",
) -> AIAdvisorOutput:
    """Call OpenAI using the openai SDK with JSON mode."""
    start_time = time.perf_counter()
    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    prompt = _build_user_prompt(precomputed, context)

    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )

    elapsed_ms = (time.perf_counter() - start_time) * 1000.0
    content = response.choices[0].message.content or "{}"
    parsed = json.loads(content)

    # Strictly preserve invariants from backend
    score = float(precomputed.get("risk_score", 0.0))
    rec = Recommendation(str(precomputed.get("recommendation", "WAIT")).upper())
    decision_alias = RECOMMENDATION_TO_ALIAS[rec.value]

    return AIAdvisorOutput(
        risk_score=score,
        recommendation=rec,
        decision_alias=decision_alias,
        explanation=parsed.get("explanation") or precomputed.get("summary", ""),
        main_contributing_factors=parsed.get("main_contributing_factors") or [
            f"{f.get('name')}: {f.get('description')}" for f in precomputed.get("risk_factors", [])
        ],
        mitigations=parsed.get("mitigations") or precomputed.get("safeguards") or precomputed.get("investigation_recommendations", []),
        deployment_timing_advice=parsed.get("deployment_timing_advice") or precomputed.get("timing_advice") or "No calendar constraints.",
        suggested_windows=_build_suggested_windows(),
        is_fallback=False,
        source="openai",
        model_name=model_name,
        generation_latency_ms=round(elapsed_ms, 2),
        anti_gaming_note=(
            "Deterministic mathematical weights for SLO consumption, latency thresholds, and calendar rules "
            "strictly govern the score. Prompt injections and change-size misrepresentations cannot override these gates."
        ),
        developer_guidance=parsed.get("developer_guidance"),
    )


# ---------------------------------------------------------------------------
# Public Coordinated Interface
# ---------------------------------------------------------------------------

def generate_release_advice(
    precomputed_analysis: dict[str, Any] | Any,
    context: Optional[dict[str, Any]] = None,
    *,
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> AIAdvisorOutput:
    """
    Generate an AI-powered advisory explanation, ranked contributing factors,
    and actionable mitigations for a precomputed release risk analysis.

    Parameters
    ----------
    precomputed_analysis : dict | AnalyzeReleaseResponse
        Precomputed analysis from risk_engine.analyze_release. Must contain:
        'risk_score', 'recommendation', 'error_budget', 'risk_factors',
        'safeguards', 'investigation_recommendations', 'summary'.
    context : Optional[dict]
        Additional request context such as 'service_name', 'change_size',
        'files_changed', 'error_rate_percent', 'latency_ms',
        'latency_threshold_ms', 'recent_incidents_30d',
        'proposed_deployment_time', 'release_notes', 'timing_advice'.
    provider : Optional[str]
        Force specific provider: "gemini", "openai", "fallback".
        Default None inspects environment variables (RELEASEGUARD_LLM_PROVIDER,
        GEMINI_API_KEY, OPENAI_API_KEY).
    model : Optional[str]
        Model name override (e.g. "gemini-2.5-flash", "gpt-4o-mini").

    Returns
    -------
    AIAdvisorOutput
        Structured JSON-compliant Pydantic model with guaranteed invariant
        preservation of backend risk_score and recommendation.
    """
    # Normalize precomputed analysis to dict if Pydantic model passed
    if hasattr(precomputed_analysis, "model_dump"):
        analysis_dict = precomputed_analysis.model_dump()
    elif isinstance(precomputed_analysis, dict):
        analysis_dict = dict(precomputed_analysis)
    else:
        raise ValueError("precomputed_analysis must be a dict or Pydantic model")

    ctx = context or {}

    # Extract API keys from environment
    gemini_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    openai_key = os.environ.get("OPENAI_API_KEY")
    selected_provider = (provider or os.environ.get("RELEASEGUARD_LLM_PROVIDER", "auto")).lower()

    # Determine execution strategy
    if selected_provider == "fallback":
        logger.info("Using deterministic fallback advisor (explicitly requested).")
        return generate_fallback_advice(analysis_dict, ctx, reason="EXPLICIT_FALLBACK_REQUESTED")

    # Try Gemini if configured or auto
    if (selected_provider in ("auto", "gemini")) and gemini_key:
        try:
            target_model = model or os.environ.get("RELEASEGUARD_LLM_MODEL", "gemini-2.5-flash")
            logger.info("Generating advice with Gemini (%s)...", target_model)
            advice = _call_gemini(analysis_dict, ctx, api_key=gemini_key, model_name=target_model)
            # HARD INVARIANT GUARD: Enforce backend score and recommendation
            advice.risk_score = float(analysis_dict["risk_score"])
            advice.recommendation = Recommendation(str(analysis_dict["recommendation"]).upper())
            advice.decision_alias = RECOMMENDATION_TO_ALIAS[advice.recommendation.value]
            return advice
        except Exception as exc:
            logger.warning("Gemini invocation failed (%s). Falling back gracefully.", exc)
            if selected_provider == "gemini":
                return generate_fallback_advice(analysis_dict, ctx, reason=f"GEMINI_ERROR: {exc}")

    # Try OpenAI if configured or auto
    if (selected_provider in ("auto", "openai")) and openai_key:
        try:
            target_model = model or os.environ.get("RELEASEGUARD_LLM_MODEL", "gpt-4o-mini")
            logger.info("Generating advice with OpenAI (%s)...", target_model)
            advice = _call_openai(analysis_dict, ctx, api_key=openai_key, model_name=target_model)
            # HARD INVARIANT GUARD: Enforce backend score and recommendation
            advice.risk_score = float(analysis_dict["risk_score"])
            advice.recommendation = Recommendation(str(analysis_dict["recommendation"]).upper())
            advice.decision_alias = RECOMMENDATION_TO_ALIAS[advice.recommendation.value]
            return advice
        except Exception as exc:
            logger.warning("OpenAI invocation failed (%s). Falling back gracefully.", exc)
            if selected_provider == "openai":
                return generate_fallback_advice(analysis_dict, ctx, reason=f"OPENAI_ERROR: {exc}")

    # If no keys or calls failed, use robust deterministic fallback
    reason = "NO_API_KEY_CONFIGURED" if not (gemini_key or openai_key) else "LLM_PROVIDER_UNAVAILABLE"
    logger.info("AI Advisor executing fallback generator (%s).", reason)
    return generate_fallback_advice(analysis_dict, ctx, reason=reason)


async def async_generate_release_advice(
    precomputed_analysis: dict[str, Any] | Any,
    context: Optional[dict[str, Any]] = None,
    *,
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> AIAdvisorOutput:
    """Async wrapper for generate_release_advice."""
    # Since generate_release_advice is lightweight (and handles fallbacks synchronously),
    # run in thread pool if IO-bound LLM call, or execute directly.
    import asyncio
    return await asyncio.to_thread(
        generate_release_advice,
        precomputed_analysis,
        context,
        provider=provider,
        model=model,
    )
