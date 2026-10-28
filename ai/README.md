# AI Agents — Zero Latency ReleaseGuard AI 🛡️

This document organizes and specifies all **AI Agents** implemented for Zero Latency ReleaseGuard AI.

---

## 1. Overview of the AI Agents Architecture

The AI layer is structured into three specialized agents coordinated by a lightweight orchestrator:

```
                            ┌──────────────────────────────────────────────┐
                            │    Deterministic Backend Analysis (API)     │
                            │  (risk_score, recommendation, error_budget)  │
                            └──────────────────────┬───────────────────────┘
                                                   │
                                                   ▼
┌───────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                             ORCHESTRATOR                                              │
│                                           (orchestrator.py)                                           │
│                                                                                                       │
│   ┌────────────────────────────────────────────────┐                                                  │
│   │ 1. Budget Agent (budget_agent.py)              │ ──> Evaluates error budget condition:           │
│   │    - Deterministic Python execution            │     HEALTHY, LOW, EXHAUSTED, INSUFFICIENT_DATA   │
│   │    - Handles undefined budgets (100% SLO)      │     Produces: {status, summary, evidence, warns} │
│   └───────────────────────┬────────────────────────┘                                                  │
│                           │                                                                           │
│                           ▼                                                                           │
│   ┌────────────────────────────────────────────────┐                                                  │
│   │ 2. Risk Agent (risk_agent.py)                  │ ──> Interprets risk contributors & ranks weights │
│   │    - Deterministic Python execution            │     Correlates actual historical release records │
│   │    - Flags telemetry limitations & assumptions │     Produces: {risk_summary, contributing_facts} │
│   └───────────────────────┬────────────────────────┘                                                  │
│                           │                                                                           │
│                           ▼                                                                           │
│   ┌────────────────────────────────────────────────┐                                                  │
│   │ 3. Optional Policy RAG (retrieval.py)          │ ──> Retrieves organizational policy context:     │
│   │    - ChromaDB in-memory policy indexing        │     SLO policy, canary checklists, escalations   │
│   └───────────────────────┬────────────────────────┘                                                  │
│                           │                                                                           │
│                           ▼                                                                           │
│   ┌────────────────────────────────────────────────┐                                                  │
│   │ 4. Explanation LLM Agent (explanation_agent.py)│ ──> Synthesizes SRE decision explanation         │
│   │    - Structured JSON output (Pydantic v2)      │     Preserves backend recommendation exactly     │
│   │    - Gemini / OpenAI or Deterministic Fallback │     Produces: {explanation, mitigations, timing} │
│   └────────────────────────────────────────────────┘                                                  │
└───────────────────────────────────────────────────────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
                            ┌──────────────────────────────────────────────┐
                            │      Backend Merged Response (schemas.py)    │
                            │    (Dashboard & API Contract Compliant)      │
                            └──────────────────────────────────────────────┘
```

---

## 2. Agent Catalog & Directory Structure

All agents are organized under both `backend/ai/` and the alias package `backend/ai_agents/`:

```
backend/
├── ai/                      # Primary agent package
│   ├── __init__.py          # Exports all agent classes & functions
│   ├── budget_agent.py      # Agent 1: Budget Agent
│   ├── risk_agent.py        # Agent 2: Risk Agent
│   ├── explanation_agent.py # Agent 3: Explanation LLM Agent
│   ├── orchestrator.py      # Multi-Agent Sequential Orchestrator
│   ├── prompts.py           # SRE Prompt definitions & templates
│   └── retrieval.py         # Optional RAG with ChromaDB
│
├── ai_agents/               # Aliased namespace for 'AI Agents'
│   ├── __init__.py
│   ├── budget_agent.py
│   ├── risk_agent.py
│   ├── explanation_agent.py
│   ├── orchestrator.py
│   ├── prompts.py
│   └── retrieval.py
│
├── data/
│   └── policies/            # Indexed policy documents for RAG
│       ├── slo_error_budget_policy.md
│       ├── deployment_safeguards_checklist.md
│       └── incident_response_escalation.md
│
└── tests/
    ├── test_agents.py       # Unit tests for all individual agents
    └── test_orchestrator.py # Integration & demo scenario tests
```

---

## 3. Individual Agent Specifications

### 🤖 Agent 1: Budget Agent (`budget_agent.py`)
- **Execution Mode**: Deterministic Python function (zero LLM latency/cost).
- **Function**: `evaluate_budget_condition(...) -> BudgetAgentOutput`
- **Responsibilities**:
  - Classifies service budget into four standard states: `HEALTHY`, `LOW`, `EXHAUSTED`, or `INSUFFICIENT_DATA`.
  - Explains remaining error budget margin and operational implications.
  - Cleary handles edge cases like 100% SLOs (zero-tolerance downtime).
  - Highlights data limitations (e.g. unverified rolling measurement windows).

### 🤖 Agent 2: Risk Agent (`risk_agent.py`)
- **Execution Mode**: Deterministic Python function (zero LLM latency/cost).
- **Function**: `evaluate_release_risk(...) -> RiskAgentOutput`
- **Responsibilities**:
  - Uses the backend risk score as the single ground truth (never overrides or calculates a competing score).
  - Ranks risk factors by contribution points (e.g. Error Budget Consumption +30.0 pts, Latency Degradation +18.5 pts).
  - Evaluates actual historical releases when available, identifying correlations with past incidents.
  - Cites telemetry data gaps (e.g. omitted file counts or 30-day incident counts).

### 📚 RAG Retrieval Module (`retrieval.py`)
- **Execution Mode**: ChromaDB in-memory retrieval.
- **Function**: `retrieve_relevant_policies(query: str, top_k: int) -> list[dict]`
- **Responsibilities**:
  - Indexes organizational policies in `backend/data/policies/`.
  - Retrieves relevant passages for the Explanation Agent (e.g. canary rollout guidelines, P0 exception escalation).
  - Fails gracefully with zero errors if ChromaDB is unavailable or empty.

### 🤖 Agent 3: Explanation LLM Agent (`explanation_agent.py`)
- **Execution Mode**: LLM (Google Gemini / OpenAI) with bounded timeouts and structured JSON schema validation.
- **Function**: `generate_explanation(...) -> ExplanationAgentOutput`
- **Responsibilities**:
  - Translates budget and risk metrics into authoritative, plain-language SRE explanations.
  - Generates 2 to 4 concrete, actionable mitigations (canary percentages, rollback triggers, soak periods).
  - Provides calendar-aware deployment timing guidance.
  - **Graceful Deterministic Fallback**: Automatically activates rule-based generation when API keys are unconfigured, rate-limited, or network fails.
  - **Prompt Hygiene**: Treats user notes and retrieved documents strictly as untrusted data to prevent prompt injections.

---

## 4. Multi-Agent Orchestrator (`orchestrator.py`)

- **Function**: `orchestrate_release_analysis(...) -> OrchestratorResult`
- **Sequential Pipeline**:
  1. Ingests precomputed deterministic analysis from backend.
  2. Runs **Budget Agent** on availability and SLO figures.
  3. Runs **Risk Agent** on factor weights and release history.
  4. Runs **Policy Retrieval** to query relevant company checklists.
  5. Runs **Explanation Agent** to formulate SRE rationale and mitigations.
  6. Returns structured output for seamless merging into the backend API response.

---

## 5. Usage & Imports

Both namespace conventions are supported:

```python
# Option A: From ai_agents namespace
from ai_agents import (
    evaluate_budget_condition,
    evaluate_release_risk,
    generate_explanation,
    orchestrate_release_analysis,
)

# Option B: From ai namespace
from ai import (
    evaluate_budget_condition,
    evaluate_release_risk,
    generate_explanation,
    orchestrate_release_analysis,
)
```

---

## 6. Test Suite & Verification

All agent modules and orchestrator scenarios are covered by automated tests:

```bash
py -3.13 -m pytest backend/tests -v
```

- **58 tests passed** in ~4 seconds.
- 100% offline reproducible with zero paid API calls required.
