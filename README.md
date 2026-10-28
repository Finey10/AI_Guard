# AI Guard 🛡️

**AO-05: Is this release safe to ship right now?**

An AI-powered deploy-time risk dashboard that brings reliability targets and change risk into the moment of release.

---

## Team Zero Latency | UG-42 | Domain: AI Ops

**Members:** Varala Vamsa Sarga · Meen Ren Tharquia · Debarek Jalmaltheerga · Ruth Vardalwati

---

## Project Structure

```
AI_Guard/
├── frontend/     # Next.js 16 + TypeScript + Tailwind CSS dashboard
├── backend/      # Python FastAPI + LangChain agents
└── data-ml/      # Data processing, SLO formulas, ML risk model
```

## Quick Start (Frontend Dashboard)

```bash
cd frontend
npm install
npm run dev
```

The dashboard will be accessible at `http://localhost:3000`.

To build and run in production:
```bash
cd frontend
npm run build
npm start
```

### Environment Configuration
Configure `NEXT_PUBLIC_API_BASE_URL` in `frontend/.env.local` (default: `http://localhost:8000`).

---

## Branches
- `main` — stable releases
- `frontend` — UI development
- `backend` — API & agent development
- `data-ml` — data processing & ML model
