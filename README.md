# SignalOps 🛡️

**AO-05: Is this release safe to ship right now?**  
*An AI-powered, pre-flight release risk advisor bringing SLO reliability targets, error budgets, and change hazards into the moment of deployment.*

[![Live App](https://img.shields.io/badge/Hosted%20App-ai--guard--amber.vercel.app-00dcff?style=for-the-badge&logo=vercel)](https://ai-guard-amber.vercel.app/)
[![Tests Passing](https://img.shields.io/badge/Tests-61%2F61%20Passing-00ff82?style=for-the-badge&logo=pytest)](https://github.com/Finey10/AI_Guard)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

🌐 **Live Deployed Application:** [https://ai-guard-amber.vercel.app/](https://ai-guard-amber.vercel.app/)  
📁 **GitHub Repository:** [https://github.com/Finey10/AI_Guard](https://github.com/Finey10/AI_Guard)

---

## 👥 Team Zero Latency | UG-42 | Domain: AI Ops

* **Varala Vamsa Sarga**
* **Meen Ren Tharquia**
* **Debarek Jalmaltheerga**
* **Ruth Vardalwati**

---

## 💡 The Problem
In modern DevOps, over 90% of production outages occur from valid, compiling code deployed at the wrong time under degraded system conditions. Developers deploy by gut-feel, static checklists, or binary CI/CD pass/fail signals. SLO documents sit unread in Confluence while error budgets burn silently.

**SignalOps** acts as an Air Traffic Controller for software releases. It evaluates live system health, error budget headroom, latency degradation, recent incidents, and corporate calendar freeze windows to deliver an explainable **GO / GO_WITH_SAFE_GUARD / WAIT** verdict before code hits production.

---

## 🏗️ 3-Tier Neuro-Symbolic Architecture

SignalOps strictly separates **mathematical risk computation** from **AI natural-language explanation**:

```
[ Tier 1: Next.js 16 Dashboard ]  (Port 3000 / Vercel)
               │
               ▼  HTTP POST /api/analyze-release
[ Tier 2: AI Agent Orchestrator ]  (Port 8000 / ai/service.py)
   ├── 1. Budget Agent      ──> Evaluates SLO availability & remaining error budget
   ├── 2. Risk Agent        ──> Analyzes multi-factor contributions & dominant hazards
   ├── 3. Explanation Agent ──> Synthesizes SRE rationale via Groq LLaMA 3.3 / Fallback
   └── 🛡️ Invariant Guard   ──> Programmatic barrier: AI can NEVER override WAIT to GO
               │
               ▼  Direct in-process call
[ Tier 3: Deterministic Engine ]   (backend/risk_engine.py)
   └── 5-Factor Weighted Scoring (Budget 30% + Errors 25% + Latency 20% + Incidents 15% + Size 10%)
```

---

## 📂 Project Structure

```
SignalOps/
├── frontend/               # Next.js 16 + TypeScript + Tailwind CSS dashboard
│   ├── src/app/            # App router pages & global theme
│   ├── src/components/     # MetricForm, BudgetGauge, RiskPanel, SignalIndicator
│   └── src/lib/            # API connector & offline deterministic simulation
├── backend/                # Pure Python Deterministic Risk Engine & REST API
│   ├── main.py             # FastAPI entrypoint
│   ├── risk_engine.py      # 5-factor mathematical scoring & force-WAIT invariants
│   ├── data_service.py     # Service catalog & deployment calendar evaluator
│   ├── data/               # Synthetic services, history, and freeze calendar
│   └── tests/              # 23 unit & integration tests (pytest)
├── ai/                     # Multi-Agent AI Orchestration Layer
│   ├── service.py          # Unified FastAPI orchestration service
│   ├── orchestrator.py     # Sequential multi-agent pipeline coordinator
│   ├── budget_agent.py     # Agent 1: SLO error budget evaluator
│   ├── risk_agent.py       # Agent 2: Telemetry & historical hazard analyzer
│   ├── explanation_agent.py# Agent 3: Groq LLaMA 3.3 / Gemini / Fallback synthesizer
│   ├── ai_advisor.py       # Heuristic explanation advisor & schema models
│   └── tests/              # 38 agent & safety invariant tests
├── SignalOps_Test_Cases.pdf# Phase 3 formal test documentation (30+ test cases)
├── requirements.txt        # Root production dependencies
└── pytest.ini              # Unified test runner configuration
```

---

## ⚙️ 5-Factor Risk Engine & Scoring Formula

The risk score is calculated deterministically on a **0 – 100 scale**:

| Factor | Weight | Evaluation Criteria |
|---|---|---|
| **💰 Error Budget Consumption** | **30 pts** | Ratio of allowed downtime consumed vs. remaining headroom |
| **⚠️ Error Rate Spike** | **25 pts** | Percentage error rate relative to healthy baselines |
| **⏱️ Latency Degradation** | **20 pts** | Observed p99 latency vs. service threshold |
| **🔥 Recent Incidents (30d)** | **15 pts** | Recent production Sev-1/Sev-2 incident frequency |
| **📦 Pull Request Change Size** | **10 pts** | small (2 pts), medium (6 pts), large (10 pts) |

### Verdict Bands:
* **✅ GO (0 – 29):** Low risk. Safe to ship with standard telemetry monitoring.
* **🛡️ GO WITH SAFEGUARD (30 – 59):** Elevated risk. Deploy with canary routing & human rollback readiness.
* **🚫 WAIT (60 – 100):** High risk. Release held until error budget recovers or fixes are applied.

> **⚡ Non-Negotiable Force-WAIT Invariants:**  
> Regardless of score, the system automatically forces **WAIT** if:
> 1. Error budget is fully exhausted (0% remaining).
> 2. Observed availability is strictly below the SLO target (`observed_availability < slo_target`).
> 3. Deployment window intersects an organizational freeze or peak-traffic window.

---

## 🚀 Quick Start Guide

### Prerequisites
* Python 3.11+
* Node.js 18+ & npm

### 1. Start Backend & AI Agent Service
```bash
# From the repository root:
python -m venv venv
venv\Scripts\activate      # On Windows (or: source venv/bin/activate on Unix)
pip install -r requirements.txt

# (Optional) Set your Groq API key for live LLM explanations:
# In ai/.env: GROQ_API_KEY=gsk_your_key_here
# If omitted, system seamlessly runs deterministic heuristic fallback

uvicorn ai.service:app --reload --port 8000
```
Interactive API Swagger Docs: `http://localhost:8000/docs`

### 2. Start Frontend Dashboard
```bash
cd frontend
npm install
npm run dev
```
Open `http://localhost:3000` in your browser.

---

## 🧪 Automated Test Suite (61 / 61 Passing)

SignalOps includes comprehensive automated test coverage across all layers:

```bash
# Run all backend unit & integration tests (23 tests):
pytest backend/tests

# Run all AI agent orchestration & invariant tests (38 tests):
pytest ai/tests

# Run the entire test suite:
pytest
```

```text
============================= 61 passed in 4.82s =============================
- 14 Risk Engine Unit Tests (SLO math, boundary conditions, force-WAIT)
- 9 Backend API Integration Tests (schemas, status codes, validations)
- 38 AI Agent & Invariant Tests (budget states, fallback, LLM safety guards)
```

---

## 🔒 Safety, Ethics & Responsible AI

* **Advisory-Only:** SignalOps advises engineers; it does not unilaterally block deployments. Human engineers retain final authority.
* **Invariant Safety Guard:** Hard-coded post-LLM validation prevents AI hallucinations from ever overriding a `WAIT` decision into a `GO`.
* **Zero Developer Surveillance:** Telemetry evaluates system metrics and PR line count impact only. Author identity data is anonymized.
* **Anti-Gaming Architecture:** Deterministic SLO thresholds and publicly documented weights prevent gaming or metric manipulation.

---

## 📄 Phase 3 Deliverables
* **Formal Test Cases Document:** [`SignalOps_Test_Cases.pdf`](SignalOps_Test_Cases.pdf)
* **Complete Source Code Package:** `SignalOps_Phase3_Code.zip`
* **Live Hosted URL:** [https://ai-guard-amber.vercel.app/](https://ai-guard-amber.vercel.app/)
