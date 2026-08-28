# RTI Navigator — Merged (Track A + Track B)

AI-guided RTI filing assistant — *Build What Moves India* hackathon.

This branch (`merged-final`) combines both tracks into one working application:

- **Track A — AI intake:** plain-language query → intent extraction → RTI-suitability
  and jurisdiction rules → authority recommendation (35 curated Indian authorities) →
  AI-drafted RTI application → 5 deterministic quality checks → validated
  **Ready-to-File** object.
- **Track B — filing lifecycle:** Ready-to-File → applicant details → demo OTP →
  documents → simulated payment → review → simulated submission → registration
  number → dashboard → status timeline → next action.

Track A hands off to Track B via `POST /api/v1/rtis`. Every non-real operation is
labelled *simulated*; nothing is filed with a real government system. When
`OPENAI_API_KEY` is unset the AI steps fall back to rehearsed responses, so the
demo never crashes.

## Demo credentials & disclosure (for reviewers)

Mock consumer login — the app never sends a real SMS or contacts a payment/government system:

| Step | How to complete it in the demo |
| --- | --- |
| Applicant OTP | Enter **`123456`** (shown on the screen; no SMS is sent) |
| Payment | Click **Mark payment success** — a simulated ₹10 fee. **Simulate failure** exercises the retry path |
| Submission | Click **Submit RTI** — generates a demo registration number `RTI/YYYY/NNNNN`; nothing is filed |
| Reset | **Demo reset** on the Dashboard restores the seeded state |

**Real / deterministic:** AI intent analysis (GPT-4o-mini, with rehearsed fallback), RTI
suitability + central/state jurisdiction rules, authority recommendation over 35 curated
authorities, 5 draft quality checks.
**Simulated:** OTP, ₹10 payment, government submission, status timeline events.

Every simulated screen carries a `SIMULATED — no real data is sent` banner, and the
Dashboard shows a "What works vs what is mocked" card. A frontend-only Demo Mode
(`VITE_DEMO_MODE=true`) runs the whole flow with no backend at all — see
`frontend/src/services/mockApi.ts`.

## End-to-end flow

```
frontend (React + TS + Vite + Tailwind)
  POST /api/v1/intent/analyze         ─┐
  POST /api/v1/authorities/recommend   │  Track A intake
  POST /api/v1/drafts/generate         │
  POST /api/v1/drafts/validate        ─┘
  POST /api/v1/rtis                   ─┐
  POST /api/v1/rtis/{id}/applicant     │
  POST /api/v1/rtis/{id}/otp/send      │  Track B lifecycle
  POST /api/v1/rtis/{id}/otp/verify    │
  POST /api/v1/rtis/{id}/payment       │
  POST /api/v1/rtis/{id}/submit       ─┘
backend (FastAPI + SQLAlchemy 2.0 + PostgreSQL)
  rules engine (deterministic)  ·  OpenAI GPT-4o-mini + fallbacks  ·  lifecycle state machine
```

## Quick start (Docker)

```bash
cp .env.example .env        # optionally add OPENAI_API_KEY
docker compose up --build
```

- Frontend: http://localhost:5173
- API + Swagger: http://localhost:8000/docs

## Local development

**Backend**
```bash
cd backend
python -m venv .venv && . .venv/Scripts/activate   # or source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL="sqlite+pysqlite:///./local-demo.db"   # or run Postgres via docker compose
uvicorn app.main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev        # http://localhost:5173  (proxies /api → :8000)
```

## Tests

```bash
cd backend
pytest              # 32 tests: Track A rules/AI parsers + Track B lifecycle
```

## Demo reset

```bash
curl -X POST http://localhost:8000/api/v1/demo        # or /api/v1/demo/reset
```
Clears Track A drafts, re-seeds the 35 authorities, and seeds one known
Ready-to-File RTI so the dashboard is never empty.
See `docs/demo-scenarios.md` for the three scripted flows.

## Environment variables

| Variable | Default | Notes |
|----------|---------|-------|
| `DATABASE_URL` | `postgresql+psycopg://rti:rti@localhost:5432/rti_navigator` | `postgresql://` URLs are auto-upgraded to psycopg v3 |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:3000` | comma-separated or JSON list |
| `OPENAI_API_KEY` | — | optional; app runs on fallbacks without it |
| `LLM_MODEL` | `gpt-4o-mini` | |
| `DEMO_OTP` | `123456` | |
| `RTI_PAYMENT_AMOUNT` | `10` | |
| `DEMO_MODE` | `true` | |

## Tech stack

FastAPI · SQLAlchemy 2.0 · Alembic · PostgreSQL · OpenAI SDK · React 18 ·
TypeScript · Vite · Tailwind CSS · TanStack Query · React Router · Docker Compose
