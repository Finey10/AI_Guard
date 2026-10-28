"""
service.py — FastAPI service for Zero Latency ReleaseGuard AI Agents.

Connects the Next.js frontend with the deterministic backend:
1. Ingests release analysis requests from frontend.
2. Invokes deterministic backend risk engine via backend_connector.
3. Coordinates Budget Agent, Risk Agent, ChromaDB Policy RAG, and Explanation Agent.
4. Formats and returns 100% compliant payload to the frontend.
"""
from __future__ import annotations

import logging
import os
import sys
from pathlib import Path
from typing import Any, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure repo root and ai/ are on sys.path
_repo_root = Path(__file__).parent.parent
if str(_repo_root) not in sys.path:
    sys.path.insert(0, str(_repo_root))
_ai_dir = Path(__file__).parent
if str(_ai_dir) not in sys.path:
    sys.path.insert(0, str(_ai_dir))

from ai.orchestrator import orchestrate_release_analysis, OrchestratorResult
from ai.budget_agent import evaluate_budget_condition, BudgetAgentOutput
from ai.risk_agent import evaluate_release_risk, RiskAgentOutput
from ai.backend_connector import backend_client
from ai.frontend_connector import format_for_frontend
from ai.retrieval import retrieve_relevant_policies, is_retrieval_active

logger = logging.getLogger("releaseguard.ai_service")
logging.basicConfig(level=logging.INFO)

app = FastAPI(
    title="ReleaseGuard AI Agents Service",
    description="Dedicated AI Agent layer connecting Next.js dashboard with deterministic backend.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Request Models
# ---------------------------------------------------------------------------

class ReleaseRequestPayload(BaseModel):
    service_name: str
    observed_availability: float
    error_rate_percent: float
    latency_ms: float
    latency_threshold_ms: float
    change_size: str = "medium"
    files_changed: Optional[int] = 10
    recent_incidents_30d: Optional[int] = 0
    recent_incidents: Optional[int] = None
    proposed_deployment_time: Optional[str] = None
    release_notes: Optional[str] = None
    slo_target: Optional[float] = None
    measurement_window: Optional[str] = "30d rolling"


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

@app.get("/health", tags=["Meta"])
async def health_check():
    """Liveness probe reporting AI Agents and Backend connection status."""
    backend_ok = backend_client.check_health()
    rag_active = is_retrieval_active()
    return {
        "status": "ok",
        "service": "ReleaseGuard AI Agents",
        "backend_connected": backend_ok,
        "policy_retrieval_active": rag_active,
    }


@app.post("/api/analyze-release", tags=["Analysis"])
async def analyze_release_endpoint(payload: ReleaseRequestPayload):
    """
    Main Release Analysis Endpoint connecting frontend to backend + AI Agents.

    Flow:
    1. Fetch deterministic risk analysis from backend risk engine.
    2. Fetch historical releases for service.
    3. Run Budget Agent on SLO/budget figures.
    4. Run Risk Agent on factor contributions.
    5. Query ChromaDB policy RAG.
    6. Run Explanation Agent (LLM or deterministic fallback).
    7. Format response for frontend dashboard.
    """
    data = payload.model_dump()
    # Normalize incidents field
    if data.get("recent_incidents") is not None and data.get("recent_incidents_30d") == 0:
        data["recent_incidents_30d"] = data["recent_incidents"]

    # 1. Fetch or compute deterministic backend analysis
    try:
        backend_result = backend_client.compute_deterministic_risk(data)
    except Exception as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Deterministic backend risk engine error: {exc}",
        )

    # 2. Fetch history and timing context
    history = backend_client.fetch_service_history(payload.service_name)
    timing_info = backend_client.fetch_deployment_timing(payload.proposed_deployment_time)

    # 3. Orchestrate AI Agents
    ai_result: OrchestratorResult = orchestrate_release_analysis(
        deterministic_analysis=backend_result,
        context=data,
        release_history=history,
        deployment_calendar=timing_info,
    )

    # 4. Format for frontend dashboard
    frontend_response = format_for_frontend(
        deterministic_analysis=backend_result,
        orchestrator_result=ai_result,
    )

    logger.info(
        "Release analyzed: service=%s score=%.1f rec=%s fallback=%s",
        payload.service_name,
        backend_result.get("risk_score", 0.0),
        backend_result.get("recommendation", "WAIT"),
        ai_result.is_fallback,
    )

    return frontend_response


@app.post("/api/ai/budget", response_model=BudgetAgentOutput, tags=["AI Agents"])
async def budget_agent_direct(payload: dict[str, Any]):
    """Direct invocation of Agent 1: Budget Agent."""
    return evaluate_budget_condition(
        slo_target=payload.get("slo_target"),
        observed_availability=payload.get("observed_availability"),
        budget_consumed_percent=payload.get("budget_consumed_percent"),
        remaining_budget_percent=payload.get("remaining_budget_percent"),
        measurement_window=payload.get("measurement_window"),
    )


@app.post("/api/ai/risk", response_model=RiskAgentOutput, tags=["AI Agents"])
async def risk_agent_direct(payload: dict[str, Any]):
    """Direct invocation of Agent 2: Risk Agent."""
    budget_output = evaluate_budget_condition(
        slo_target=payload.get("slo_target", 99.9),
        observed_availability=payload.get("observed_availability", 99.9),
        budget_consumed_percent=payload.get("budget_consumed_percent", 0.0),
        remaining_budget_percent=payload.get("remaining_budget_percent", 100.0),
    )
    return evaluate_release_risk(
        risk_score=float(payload.get("risk_score", 0.0)),
        recommendation=str(payload.get("recommendation", "WAIT")),
        risk_factors=payload.get("risk_factors", []),
        budget_agent_output=budget_output,
        release_history=payload.get("release_history"),
        service_metrics=payload.get("service_metrics"),
    )


@app.get("/api/ai/policies", tags=["AI Agents"])
async def list_policies(query: str = "release safeguards and error budget"):
    """Query ChromaDB for indexed organizational policies."""
    docs = retrieve_relevant_policies(query=query, top_k=3)
    return {
        "query": query,
        "count": len(docs),
        "documents": docs,
        "retrieval_active": is_retrieval_active(),
    }


@app.post("/api/advisor/explain", tags=["AI Agents"])
@app.post("/api/ai/explain", tags=["AI Agents"])
async def advisor_explain_endpoint(precomputed_payload: dict[str, Any]):
    """Direct endpoint to explain any precomputed risk analysis."""
    from ai.ai_advisor import generate_release_advice
    precomputed = precomputed_payload.get("precomputed_analysis", precomputed_payload)
    context = precomputed_payload.get("context", {})
    return generate_release_advice(precomputed, context)
