# Zero Latency · ReleaseGuard AI (Frontend) 🛡️

**Deployment-Time Reliability & Change Risk Decision Support**  
**Hackathon Team: Zero Latency (Team No. UG-42)**  
**Problem AO-05: Is this release safe to ship right now?**

---

## Overview

Zero Latency ReleaseGuard AI is a DevOps/SRE dashboard that brings real-time error-budget health and change-risk estimation into the moment of release.

![Zero Latency ReleaseGuard AI Dashboard](public/dashboard_preview.jpg)

### Core Capabilities:
- **Error Budget Real-Time Visibility:** Radial gauge tracking Google SRE 30-day rolling error budgets, allowed unavailability, consumed ratio, and remaining headroom.
- **Calibrated Multi-Factor Risk Meter:** Continuous 0–100 risk score based on blast radius, change scope, recent outage frequency, latency deviation, and traffic calendar alignment.
- **Agentic Decision Support:** Recommends `GO`, `GO WITH SAFEGUARD`, or `WAIT` with plain-English rationales, actionable mitigations, and alternative deployment windows.
- **Factor Attribution List:** Transparently separates deterministic system metrics from AI-synthesized reasoning.
- **Reproducible SRE Presets:** One-click simulation of Safe, Risky, and Safeguard deployment scenarios.
- **Graceful Fallback Mode:** Seamlessly operates offline with a mathematically consistent local mock engine when the FastAPI backend is disconnected.

---

## Technology Stack

- **Framework:** Next.js (App Router, Turbopack)
- **Language:** TypeScript
- **Styling:** Tailwind CSS (Dark DevOps theme)
- **Icons:** Lucide React
- **Data Visualization:** Recharts
- **HTTP Client:** Native Fetch API with timeout controller & graceful fallback

---

## Environment Configuration

Configure the backend API URL using `.env.local` or environment variables:

```bash
# Default backend URL (FastAPI)
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

If the backend server is unreachable, the dashboard automatically shifts to **Demo / Mock Mode** and flags all data accordingly without breaking the user experience.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Development Mode
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

### 3. Production Build & Execution
```bash
npm run build
npm run start
```

---

## API Contract

The frontend connects to the backend via:

### `POST /api/analyze-release`

#### Request Payload:
```json
{
  "service_name": "checkout-service",
  "slo_target": 99.9,
  "observed_availability": 99.95,
  "error_rate_percent": 0.2,
  "latency_ms": 180,
  "latency_threshold_ms": 250,
  "recent_incidents": 0,
  "change_size": "small",
  "proposed_deployment_time": "2026-10-29T17:00:00",
  "release_notes": "Checkout caching improvement"
}
```

#### Response Payload:
```json
{
  "risk_score": 18,
  "remaining_budget_percent": 78.4,
  "budget_consumed_percent": 21.6,
  "recommendation": "GO",
  "risk_factors": [
    {
      "name": "Error Budget Capacity",
      "impact": "low",
      "weight": 10,
      "description": "78.4% error budget remaining provides substantial headroom.",
      "is_ai_generated": false
    }
  ],
  "explanation": "Release meets all reliability criteria...",
  "mitigations": [
    "Standard automated canary verification (10% traffic for 10 minutes)",
    "Continuous Prometheus error-budget burn rate monitoring"
  ],
  "deployment_timing_advice": "Proposed window is off-peak and safe to proceed.",
  "suggested_windows": [
    {
      "window": "2026-10-29T10:30:00Z - 11:30:00Z",
      "risk_level": "low",
      "label": "Selected Window (Optimal Off-Peak)",
      "is_simulated": true
    }
  ]
}
```

---

## Safety, Privacy & Compliance Guarantees

1. **Non-Surveillance Guarantee:** Individual author identifiers are omitted; only aggregated/anonymized experience tiers are evaluated.
2. **Advisory Authority:** The system never blocks or triggers deployments autonomously. Human SREs maintain ultimate authority.
3. **Anti-Gaming Protections:** Guards against micro-PR splitting and edge-of-freeze deployments.
