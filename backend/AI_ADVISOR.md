# AI Advisor Module — Zero Latency ReleaseGuard AI 🛡️

The **AI Advisor** module provides automated, SRE-grade risk explanations, contributing factor ranking, and actionable mitigations for **Zero Latency ReleaseGuard AI**. It bridges the gap between deterministic error-budget mathematics and developer decision-making at the moment of release.

---

## 1. Mission & Core Philosophy

In high-velocity software engineering, release decisions are frequently made on gut feel (*"it's Friday"*, *"this service feels brittle"*), while reliability targets (SLOs) remain buried in documents. 

ReleaseGuard AI brings SLOs and change risk directly into the deployment pipeline. The **AI Advisor** module acts as an intelligent decision-support copilot:
- It **receives precomputed deterministic risk assessments** from the backend risk engine.
- It **never alters or overrides** the backend's deterministic risk score or `DEPLOY`/`MONITOR`/`HOLD` (`GO`/`GO_WITH_SAFE_GUARD`/`WAIT`) recommendation.
- It translates complex telemetry and error-budget burn into clear, persuasive explanations for developers—especially when a developer might disagree with a `HOLD` / `WAIT`.
- It formulates concrete, actionable mitigations (canaries, one-click rollback, feature flags, staging load tests).
- It provides calendar-aware timing advice (flagging freeze windows, peak traffic hours, or low-risk windows).

---

## 2. Invariant Guarantees & Constraints

| Invariant | Guarantee | Enforcement Mechanism |
| :--- | :--- | :--- |
| **Immutable Risk Score** | Backend risk score (0–100) is the ground truth and cannot be modified. | Defensive binding in `generate_release_advice`: any LLM score is overwritten with `precomputed_analysis['risk_score']`. |
| **Immutable Recommendation** | Recommendation (`GO`, `GO_WITH_SAFE_GUARD`, `WAIT` / `DEPLOY`, `MONITOR`, `HOLD`) cannot be altered. | Defensive binding in `generate_release_advice`: backend recommendation is strictly preserved. |
| **Structured Output** | All outputs strictly conform to the `AIAdvisorOutput` Pydantic v2 schema. | Validated JSON parsing and Pydantic schema validation. |
| **Zero External Failure** | System never crashes if LLM API is down, rate-limited, or unconfigured. | Deterministic rule-based fallback engine triggers immediately and seamlessly. |
| **Author Privacy** | No individual developer surveillance or performance profiling. | System prompt and fallback heuristics strictly analyze system health and code scope; developer identity is never evaluated. |
| **Advisory Scope** | Advisory-only decision support. | Adheres to evaluation boundary: advises human engineers and SREs; does not trigger or block CI/CD pipelines directly. |

---

## 3. Coordinated Function Signature & API Contract

### Python Function Signature (`ai_advisor.py`)

```python
def generate_release_advice(
    precomputed_analysis: dict | AnalyzeReleaseResponse,
    context: Optional[dict] = None,
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
        Contextual release request parameters: 'service_name', 'change_size',
        'files_changed', 'error_rate_percent', 'latency_ms',
        'latency_threshold_ms', 'recent_incidents_30d',
        'proposed_deployment_time', 'release_notes', 'timing_advice'.
    provider : Optional[str]
        Force specific provider: "gemini", "openai", "fallback", or "auto" (default).
    model : Optional[str]
        Model name override (e.g. "gemini-2.5-flash", "gpt-4o-mini").

    Returns
    -------
    AIAdvisorOutput
        Structured JSON-compliant Pydantic model with guaranteed invariant
        preservation of backend risk_score and recommendation.
    """
```

### Async Signature (`ai_advisor.py`)

```python
async def async_generate_release_advice(
    precomputed_analysis: dict | AnalyzeReleaseResponse,
    context: Optional[dict] = None,
    *,
    provider: Optional[str] = None,
    model: Optional[str] = None,
) -> AIAdvisorOutput:
    ...
```

### Response Schema (`AIAdvisorOutput`)

```json
{
  "risk_score": 78.5,
  "recommendation": "WAIT",
  "decision_alias": "HOLD",
  "explanation": "HOLD: Deployment for 'checkout-service' is paused because error budget is exhausted (0.00% remaining against 99.9% SLO) and composite risk score (78.5/100) exceeds safety threshold of 60.0. Shipping now introduces unacceptable downtime probability against current reliability commitments. Observed availability is 99.7500% against an SLO target of 99.9%.",
  "main_contributing_factors": [
    "Error Budget Consumption (+30.0 pts): 100% budget consumed",
    "Latency Degradation (+18.5 pts): Latency 450ms exceeds 300ms threshold",
    "Recent Incidents (30d) (+15.0 pts): 3 incidents in 30 days"
  ],
  "mitigations": [
    "Halt release until current telemetry stabilizes and error budget burn rate drops below 1.0x.",
    "Investigate and resolve active errors or elevated latency before introducing new code changes.",
    "If change is an emergency hotfix for an active P0 outage, initiate emergency escalation protocol with SRE lead.",
    "Decompose release into smaller, lower-risk feature-flagged units to minimize blast radius.",
    "Reschedule deployment for an authorized low-risk maintenance window (e.g., Tuesday or Wednesday morning)."
  ],
  "deployment_timing_advice": "⚠️ PEAK WINDOW: 'Friday afternoon'. Elevated traffic risk.",
  "suggested_windows": [
    {
      "window": "Tuesday 09:00 - 12:00 UTC",
      "risk_level": "low",
      "label": "Low Traffic Window",
      "is_simulated": true
    },
    {
      "window": "Wednesday 09:00 - 12:00 UTC",
      "risk_level": "low",
      "label": "Mid-week Stable Window",
      "is_simulated": true
    }
  ],
  "is_fallback": false,
  "source": "gemini",
  "model_name": "gemini-2.5-flash",
  "generation_latency_ms": 245.2,
  "anti_gaming_note": "Deterministic mathematical weights for SLO consumption, latency thresholds, and calendar rules strictly govern the score. Prompt injections and change-size misrepresentations cannot override these gates.",
  "developer_guidance": "Disagree with HOLD? To request an exception: 1) Verify all rollback automation is pre-tested, 2) Obtain sign-off from the On-Call SRE and Engineering Manager, and 3) Ensure an active incident channel is open."
}
```

### Recommendation & Decision Aliases Mapping

| Backend Heuristic | Decision Alias | Meaning & Operational Guidance |
| :--- | :--- | :--- |
| **`GO`** | **`DEPLOY`** | Low risk (<30 pts). Safe for standard automated deployment pipeline. |
| **`GO_WITH_SAFE_GUARD`** | **`MONITOR`** | Moderate risk (30–59 pts). Cleared to deploy ONLY with active canaries, live telemetry monitoring, and primed rollback runbooks. |
| **`WAIT`** | **`HOLD`** | High risk (≥60 pts, budget exhausted, or below SLO). Deployment blocked until telemetry stabilizes or exception granted. |

---

## 4. Setup & Environment Configuration

### Step 1: Install Dependencies
The module requires Python 3.11+ with Pydantic v2 and Python-dotenv:
```bash
pip install -r backend/requirements.txt
```
*(Optional LLM SDKs: `google-genai` for Gemini or `openai` for OpenAI).*

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env` in `backend/`:
```bash
cp backend/.env.example backend/.env
```

Set your desired LLM credentials:
```ini
# Provider strategy: 'auto' (checks GEMINI then OPENAI), 'gemini', 'openai', or 'fallback'
RELEASEGUARD_LLM_PROVIDER=auto

# Google Gemini API key (recommended):
GEMINI_API_KEY=AIzaSy...

# Or OpenAI API key:
# OPENAI_API_KEY=sk-...

# Optional model override:
# RELEASEGUARD_LLM_MODEL=gemini-2.5-flash
```

> [!NOTE]
> If no API key is provided, ReleaseGuard **automatically activates the deterministic fallback engine**. You never experience broken requests or downtime.

---

## 5. API Endpoints

### 1. `POST /api/analyze-release` (Integrated Analysis & Advice)
Primary endpoint used by CI/CD systems and the frontend dashboard. Computes deterministic risk factors and synthesizes AI advisory output in one call.

```bash
curl -X POST "http://localhost:8000/api/analyze-release" \
  -H "Content-Type: application/json" \
  -d '{
    "service_name": "checkout-service",
    "change_size": "medium",
    "files_changed": 12,
    "observed_availability": 99.92,
    "error_rate_percent": 0.4,
    "latency_ms": 210,
    "latency_threshold_ms": 500,
    "recent_incidents_30d": 1,
    "proposed_deployment_time": "2026-10-28T10:00:00Z",
    "release_notes": "Promo code optimization"
  }'
```

### 2. `POST /api/advisor/explain` (Direct AI Advisor Endpoint)
Allows inspecting or testing the AI Advisor directly by supplying any precomputed analysis.

```bash
curl -X POST "http://localhost:8000/api/advisor/explain" \
  -H "Content-Type: application/json" \
  -d '{
    "precomputed_analysis": {
      "service_name": "checkout-service",
      "risk_score": 75.0,
      "recommendation": "WAIT",
      "error_budget": {
        "slo_target": 99.9,
        "observed_availability": 99.5,
        "budget_consumed_percent": 100.0,
        "remaining_budget_percent": 0.0,
        "is_exhausted": true
      },
      "risk_factors": [
        {"name": "Error Budget Consumption", "contribution": 30.0, "description": "Consumed"}
      ],
      "summary": "WAIT — Error budget exhausted"
    }
  }'
```

---

## 6. Safety, Security & Anti-Gaming Analysis

### Author Surveillance Prohibition (Ethical SRE Rubric)
- **Constraint**: Author metrics must never become a tool for individual performance surveillance.
- **Guardrail**: The AI Advisor prompt and fallback generator explicitly disallow evaluating individual engineers. Author tenure or identity is strictly aggregated or excluded from explanations. The focus remains exclusively on code change blast radius, service reliability, and error budget availability.

### How Could Teams Game the System?
1. **Batch Slicing / PR Splitting**: A team attempting to deploy a large, risky release during a high-traffic window splits the PR into 5 "small" PRs to game the `change_size` factor (2 points instead of 10 points).
2. **Commit Note Manipulation**: Injecting deceptive release notes (e.g., *"trivial typo fix"*) to prompt-inject the LLM into giving a `GO` recommendation.
3. **Deploying Right Before Incident Logs**: Rushing code out before active metric spikes trigger incident counter increments.

### How ReleaseGuard Guards Against Gaming:
1. **Hard Mathematical SLO Floors**: In `risk_engine.py`, if the error budget is exhausted (`remaining_budget_percent == 0`) or if `observed_availability < slo_target`, the recommendation is **forced to `WAIT` / `HOLD` regardless of change size**. A developer could declare change size as "small", but 0% remaining budget makes deployment impossible without explicit exception.
2. **Defensive Invariant Binding**: The AI Advisor cannot alter `risk_score` or `recommendation`. Prompt injections in release notes cannot convince the LLM to change the verdict because the LLM is not permitted to touch the decision.
3. **Calendar Hard Gates**: Freeze windows and peak traffic windows are computed globally from UTC timestamps in `data_service.py` and apply across all change sizes.

---

## 7. Running Tests

Execute the full backend and AI advisor test suite:

```bash
py -3.13 -m pytest backend/tests -v
```

All 36 unit and integration tests validate:
- Invariance under LLM hallucination
- Graceful fallback upon API error or missing keys
- SRE explanation quality and developer disagreement guidance
- Privacy and non-surveillance compliance
- Anti-gaming notes and safeguards
- Full compatibility with frontend data structures
