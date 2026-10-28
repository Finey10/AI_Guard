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

## Quick Start (Backend API & AI Advisor)

### 1. Setup Python Environment & Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Configure Environment (.env)
```bash
cp .env.example .env
```
Set your `GEMINI_API_KEY` (or `OPENAI_API_KEY`). If no API key is provided, the AI Advisor automatically and gracefully runs using the deterministic high-precision rule fallback engine.

### 3. Launch Backend API
```bash
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
API docs available at `http://localhost:8000/docs`.

### 4. Run Test Suite
```bash
py -3.13 -m pytest backend/tests -v
```
Runs all 36 unit and integration tests including the AI Advisor invariants, fallback mechanisms, SRE guidance, anti-gaming safeguards, and API endpoints.

For in-depth details on the AI Advisor module, see [backend/AI_ADVISOR.md](file:///d:/Hacksmitten/AI_Guard/backend/AI_ADVISOR.md).

---

## Branches
- `main` — stable releases
- `frontend` — UI development
- `backend` — API & agent development
- `data-ml` — data processing & ML model
