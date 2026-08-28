# RTI Navigator — 2-Person Execution Plan

## 1. Final Ownership Matrix

| Item | Owner |
|---|---|
| Intent homepage (F1) screen | P1 |
| Suitability/Jurisdiction screen (F2) | P1 |
| Authority Finder screen (F3) | P1 |
| Draft Assistant screen (F4) | P1 |
| Quality Check screen (F5) | P1 |
| Ready-to-File screen | P1 (produces), P2 (consumes) |
| Applicant Details screen | P2 |
| Documents screen | P2 |
| Payment screen | P2 |
| Review screen | P2 |
| Confirmation screen | P2 |
| Dashboard screen | P2 |
| RTI Details/Timeline screen | P2 |
| `POST /api/v1/intent/analyze` | P1 |
| `POST /api/v1/authorities/recommend` | P1 |
| `POST /api/v1/drafts/generate` | P1 |
| `POST /api/v1/drafts/validate` | P1 |
| `POST /api/v1/rtis` (create from Ready-to-File) | P2 |
| `POST /api/v1/rtis/{id}/payment` | P2 |
| `POST /api/v1/rtis/{id}/submit` | P2 |
| `GET /api/v1/rtis`, `GET /api/v1/rtis/{id}` | P2 |
| `POST /api/v1/documents` | P2 |
| `POST /api/v1/demo/reset` | Joint (endpoint implemented by P2; both seed their half) |
| `users` table | Joint schema, P2 writes (applicant) |
| `authorities` table | P1 |
| `drafts` table | P1 |
| `rtis` table | P2 owns all writes; P1 does not query it directly |
| `status_events` table | P2 |
| `documents` table | P2 |
| `payments` table | P2 |
| Rules: `rti_classifier.py`, `jurisdiction.py`, `validation_rules.py` | P1 |
| Rules: status transitions, next-action mapping | P2 |
| AI: intent extraction, draft generation | P1 |
| AI: response completeness (P2/P3 feature) | P2 (only if ahead) |
| AIService abstraction (`ai/interface.py`, `ai/provider.py`) | Joint, built Day 1, P1 primary maintainer |
| Error/response format standard | Joint, frozen Day 1 |
| Docker/compose, CI-lite scripts | Joint |
| Demo scenario scripts (3x) | Joint |
| Unit tests P1 domain | P1 |
| Unit tests P2 domain | P2 |
| E2E test (full journey) | Joint |
| Not needed for MVP | live govt API, real payment, multilingual, native mobile, appeals automation |

---

## 2. Shared Contracts

### 2.1 Ready-to-File Object (the core handoff)

```json
{
  "draft_id": 101,
  "authority_id": 12,
  "authority_name": "Ministry of Health and Family Welfare",
  "jurisdiction": "central",
  "category": "health",
  "request_text": "Please provide the sanctioned budget, work order, expenditure incurred, current completion status and expected completion date for ...",
  "original_query": "How much did Ministry of Health spend on government hospitals in 2025?",
  "validation_status": "ready",
  "quality_checks": {
    "authority": true,
    "jurisdiction": true,
    "information_request": true,
    "specificity": true,
    "character_limit": true
  },
  "applicant": null
}
```

Field rules:
- `draft_id` (int, required) — FK to `drafts` table, P1 owns.
- `authority_id` (int, required), `authority_name` (string, required) — denormalized for display without extra join.
- `jurisdiction` (enum: "central"|"state", required). This is the final jurisdiction decision from P1's deterministic rules; the upstream AI intent response uses `jurisdiction_hint` only.
- `category` (string, required).
- `request_text` (string, required, ≤3000 chars — enforced before this object is created).
- `original_query` (string, required, for audit/demo transparency).
- `validation_status` (enum: "ready"|"needs_review", required — P2 refuses to accept anything not "ready").
- `quality_checks` (object, required, all keys must be `true` for status "ready").
- `applicant` (null at handoff — P2 fills this in during Applicant Details step).

Ownership: **P1 creates** this object (via `drafts/validate` → `drafts` table row). **P2 owns modification** from this point forward — it becomes the seed of the `rtis` row. If P2 needs a new field, P2 requests it from P1; P1 adds it to the `drafts` schema and the object contract (never the reverse — P2 does not silently add fields to P1's output).

Transport: P1's frontend calls `POST /api/v1/rtis` with this object as body when user clicks "File this RTI." P2's backend validates required fields (422 if `validation_status != "ready"`) and creates the `rtis` row, returning `{"rti_id": ..., "status": "READY_TO_FILE"}`. Frontend then routes to `/filing/:rti_id`.

### 2.2 Other Shared Contracts

**User (minimal, MVP):**
```json
{"id": 1, "name": "string", "email": "string", "mobile": "string", "address": "string"}
```
Owned by P2 (created during Applicant Details), read-only reference for P1 if needed (not needed pre-filing).

**Authority:**
```json
{"id": 12, "name": "string", "jurisdiction": "central|state", "category": "string", "keywords": "string", "active": true}
```
Owned by P1, read-only for P2 (P2 just stores `authority_id`/`authority_name` on the RTI row).

**Status Event:**
```json
{"id": 1, "rti_id": 101, "status": "SUBMITTED", "title": "Application submitted", "description": "...", "timestamp": "ISO8601", "metadata": {}}
```
Owned entirely by P2.

**Standard Error Format (frozen Day 1, used by both):**
```json
{"error": {"code": "VALIDATION_ERROR", "message": "human-readable message", "details": {}}}
```

**Standard Success Envelope:** plain resource JSON, no wrapper (keeps things simple — FastAPI default response model per endpoint, no generic `{data: ...}` wrapper needed for a 2-person hackathon).

---

## 3. Day 1 — Architecture Freeze

Joint (both, first half of Day 1):
- Repo structure (section 7 of architecture doc) — create empty skeleton, push to `main`.
- Freeze DB schema (section 8) — write Alembic initial migration together.
- Freeze API contracts (section 9) — write OpenAPI stub / Pydantic schema files, no logic yet.
- Freeze Ready-to-File object (section 2.1 above) — commit as `docs/contracts.md` + shared Pydantic model `schemas/rti_contract.py` + matching TS type `frontend/src/types/rti.ts`.
- Naming conventions: snake_case backend, camelCase frontend (converted at API boundary), file naming matches repo structure doc.
- Git workflow (section 10 below) agreed.
- `docker-compose.yml` (api + postgres) written and both confirm `docker compose up` works locally.
- Design system boundaries: Tailwind config, shared `components/common/` (Button, Card, Input, Timeline atoms) — agree who builds these (P2, since P2's dashboard/timeline needs more atoms first) so neither duplicates them.
- 3 demo scenarios scripted in plain English (ideal / wrong jurisdiction / bad request) — exact input text frozen now so both people build against the same fixtures.
- MVP cut line confirmed: F1–F8 P0 only, everything else P1–P3 per section 19 of architecture doc.

After contracts frozen (second half of Day 1), independently:
- **P1** starts: intent screen scaffold, `intent.py` route stub, `AIService` interface skeleton.
- **P2** starts: FastAPI project skeleton, SQLAlchemy models for all 7 tables, Alembic migration, Docker verification, `rtis`/`status_events` route stubs.

---

## 4. Day-by-Day Execution Plan

### Day 1 — Foundations (see section 3 above for full detail)
**P1:** repo/contract work (joint AM) → intent screen scaffold + `/intent/analyze` stub returning hardcoded JSON. Files: `frontend/src/pages/Intent/`, `backend/app/api/routes/intent.py`, `backend/app/ai/interface.py`. DoD: intent screen renders, hits stub endpoint, gets back mock JSON.
**P2:** repo/contract work (joint AM) → all 7 SQLAlchemy models + first Alembic migration + docker-compose verified. Files: `backend/app/models/*`, `backend/app/db/`. DoD: `docker compose up` runs Postgres + migrations cleanly, tables exist.
**Joint:** contracts frozen and committed (see section 3). Demo scenarios written down in `docs/demo-scenarios.md`.

### Day 2 — Independent Vertical Slices, Mocked Boundaries
**P1:** Build suitability/jurisdiction screen + rules (`rti_classifier.py`, `jurisdiction.py`) with hardcoded/mocked AI response; authority finder screen using hardcoded 20-authority JSON fixture (real curated DB not needed yet, just fixture file). Files: `rules/`, `pages/Authority/`, `services/authority_service.py` (stubbed). DoD: user can type text → see suitability verdict → see authority recommendation, all on mocked data, full click-through works.
**P2:** Build filing stepper UI using a **mocked Ready-to-File object** (hardcoded JSON matching the frozen contract) as the entry point — no dependency on P1 yet. Implement `rti_service.py`, mock `payment_service.py`, submission logic generating a fake registration number. Files: `pages/Filing/`, `pages/Payment/`, `pages/Confirmation/`, `services/rti_service.py`, `services/payment_service.py`. DoD: hardcoded Ready-to-File JSON → full filing stepper → mock payment → registration number displayed, end to end, no P1 dependency.
**Joint:** 15-min end-of-day sync — confirm both are still building against the exact same contract shape (no drift).

**Checkpoint — End of Day 2:**
P1: text input → mocked suitability verdict → mocked authority recommendation, click-through works.
P2: mocked Ready-to-file object → filing stepper → mock payment → mock submission works.

### Day 3 — Real Intelligence + Real Lifecycle
**P1:** Replace mocked AI with real `AIService` calls (intent extraction + draft generation), wire real curated authority DB (20–50 rows) into `authority_service.py`, build Draft Assistant + Quality Check screens with real validation rules (char limit, required fields). Files: `ai/provider.py`, `ai/prompts/intent_v1.txt`, `ai/prompts/draft_v1.txt`, `services/drafting_service.py`, `rules/validation_rules.py`, `pages/Draft/`, `pages/Review` quality check portion.
**P2:** Build dashboard (list) + RTI details/timeline screens against real `status_events` table; implement status state machine transitions (seeded/simulated progression) and next-action mapping logic. Files: `services/status_service.py`, `pages/Dashboard/`, `pages/RTIDetails/`, `rules/` (status/next-action tables inside status_service or a small `rules/status_rules.py`).
**Joint:** Confirm AIService fallback behavior works (kill the AI key, verify fallback draft still produces a valid draft) — do this together since both need to trust the AI layer won't crash the demo.

**Checkpoint — End of Day 3:**
P1: real AI draft flow works end-to-end (query → classify → authority → draft → quality check), no more mocked AI.
P2: full RTI lifecycle (dashboard, timeline, next-action) works against real `status_events` data (still using a mocked/hardcoded Ready-to-File input).

### Day 4 — First Real Integration (Full MVP Integration Day)
**Joint (AM):** Execute Integration Procedure (section 12) — replace P2's mocked Ready-to-File JSON with P1's real `POST /api/v1/rtis` call from the actual Ready-to-File screen. Run the 3 demo scenarios end to end.
**P1 (PM):** Fix any contract mismatches on their side (e.g., missing field, wrong enum value), polish authority explanation UI.
**P2 (PM):** Fix any contract mismatches on their side, ensure `rtis` creation handles all 3 demo scenario shapes (including the "wrong jurisdiction" and "bad request" branches, which may terminate before reaching Ready-to-File — P2's dashboard should not assume every session reaches filing).

**Mandatory milestone: by end of Day 4, the entire MVP journey works end-to-end, unpolished but functional.**

**Checkpoint — End of Day 4:** Full journey works: intent → suitability → authority → draft → quality check → ready to file → applicant → documents → payment → review → submit → registration → dashboard → timeline → next action. All 3 demo scenarios runnable.

### Day 5 — Polish
**P1:** AI UX polish (loading/explanation states), transitions, error states for AI failure/low-confidence authority, mobile responsiveness on their screens.
**P2:** Lifecycle reliability, deterministic demo state seeding via `/demo/reset`, backend error handling polish (payment failure, submission retry), loading states, DB consistency checks (no orphaned drafts/rtis).
**Joint:** Cross-review each other's screens for visual consistency (shared Tailwind tokens/components). Optional: response completeness checker only if both are fully done early (P2, P2 stretch item).

### Day 6 — Demo Engineering
**Joint (AM):** Build/finalize `/demo/reset` seeding all 3 scenarios deterministically. Write the e2e test script covering all 3 scenarios.
**P1:** Lock down demo-scenario-1 and -3 behavior (AI-dependent paths) with pre-written fallback text confirmed to trigger correctly if AI is flaky.
**P2:** Lock down demo-scenario-2 (wrong jurisdiction) and status/timeline determinism for all 3 scenarios — no random timing, no flaky ordering.
**Joint (PM):** Full dry-run of the demo, timed, both present. Fix anything that breaks.

**Checkpoint — End of Day 6:** All 3 demo scenarios run reliably, repeatedly, back-to-back, with reset between runs.

### Day 7 — Freeze
**Joint:** No new features. Bug fixes only. Final deployment (frontend host + backend container + managed Postgres). README finalized. Architecture diagram exported. Full demo rehearsed at least 3 times. Backup plan confirmed (local docker-compose fallback if hosted deployment has issues).

---

## 5. Development Progression

- **Stage 0 — Empty repo:** nothing exists. Both people only have the two spec docs.
- **Stage 1 — Architecture skeleton (Day 1):** repo structure, DB models, Docker, contracts frozen. Nothing functional yet, but `docker compose up` runs and both can `git pull` and start coding without touching shared files again.
- **Stage 2 — Independent vertical slices (Day 2):** P1's intent→authority click-through works on mocks. P2's Ready-to-File→filing→submission works on mocks. Neither depends on the other. Testable: each slice manually, independently.
- **Stage 3 — First API integration (Day 3 end / Day 4 start):** P1's real AI/authority/draft pipeline works standalone. P2's real lifecycle/dashboard works standalone (still fed by mock). Testable: each slice's own unit tests pass.
- **Stage 4 — Full MVP integration (Day 4):** P1's Ready-to-File screen calls P2's real `POST /api/v1/rtis`. Full journey connected. Testable: e2e demo-scenario walkthrough, manually.
- **Stage 5 — Polish (Day 5):** error states, mobile, loading states added on both sides. Testable: manual QA pass + edge cases (payment failure, AI failure).
- **Stage 6 — Demo hardening (Day 6):** deterministic seeding, fallback text confirmed, timed rehearsal. Testable: automated e2e script + live rehearsal.
- **Stage 7 — Submission (Day 7):** deployed, documented, rehearsed. Testable: cold-start test — fresh clone, `docker compose up`, demo works.

---

## 6. Parallel Development Strategy

Day 1: contracts frozen (Ready-to-File object, error format, DB schema) — both work off paper/code contracts, not each other's running code.

Day 2: P1 builds against **hardcoded mock AI/authority responses** (JSON fixture files, not even a real endpoint needed yet — just static JSON the frontend reads). P2 builds against a **hardcoded mock Ready-to-File JSON** (a fixture file matching section 2.1 exactly) fed directly into the filing stepper, bypassing P1's screens entirely.

Day 3: P1 replaces mocked AI responses with real `AIService` calls; still no dependency on P2. P2 replaces nothing structurally yet, but hardens the real state machine/dashboard against the same fixture.

Day 4: the ONE actual cross-team wire-up — P1's Ready-to-File screen now calls the real `POST /api/v1/rtis` instead of P2 reading a static fixture. This is the single integration point in the entire project; everything before it was independent.

Day 5–7: no new cross-boundary dependencies introduced — polish stays within each person's slice, except shared visual components already agreed on Day 1.

This means the two people are only ever blocked on each other for roughly half of Day 4 (the integration morning) — everything else is parallelizable.

---

## 7. API-First Integration Table

| Boundary API | Request | Response | Owner | Mock (Day 1–3) | Real (Day 4+) | Test method |
|---|---|---|---|---|---|---|
| `POST /api/v1/rtis` | Ready-to-File object (2.1) | `{"rti_id":101,"status":"READY_TO_FILE"}` | P2 | P2 reads static fixture file instead of calling this | P1's frontend calls it live | contract test: P1 posts frozen fixture, P2 asserts 201 + shape |
| `GET /api/v1/rtis/{id}` | — | RTI + status_events | P2 | n/a (P2-only until dashboard) | used from Day 3 | unit test on P2 side |
| `POST /api/v1/intent/analyze` | `{"text":...}` | intent JSON | P1 | frontend reads static JSON | real from Day 3 | unit test on P1 side |
| `POST /api/v1/authorities/recommend` | category/entities | authority JSON | P1 | static fixture | real from Day 3 | unit test on P1 side |
| `POST /api/v1/drafts/generate` | intent+authority | draft JSON | P1 | static fixture | real from Day 3 | unit test on P1 side |
| `POST /api/v1/drafts/validate` | draft text | validation JSON | P1 | static fixture | real from Day 3 | unit test on P1 side |
| `POST /api/v1/rtis/{id}/payment` | — | payment result | P2 | mocked from start (always mocked, no "real" version exists) | n/a | unit test |
| `POST /api/v1/rtis/{id}/submit` | — | registration number | P2 | mocked from start | n/a | unit test |
| `POST /api/v1/demo/reset` | — | 200 | Joint | n/a | built Day 6 | manual + e2e script |

First APIs implemented for real: `POST /api/v1/intent/analyze` and `POST /api/v1/rtis` — these gate everything else, prioritized Day 3–4.

---

## 8. Database Ownership

- `authorities`, `drafts` — P1 writes; P2 never writes to these, may read `authority_id`/`authority_name` only via the Ready-to-File object (denormalized), not via direct query.
- `rtis`, `status_events`, `documents`, `payments` — P2 writes exclusively.
- `users` — P2 writes (created at Applicant Details step).

**Recommendation:** both people access the database **only through their own services**, never raw cross-service queries. P1's services never query `rtis`/`status_events` directly; P2's services never query `drafts`/`authorities` directly. The only cross-boundary data flow is the Ready-to-File JSON object passed over HTTP (`POST /api/v1/rtis`), not a shared DB read. This avoids migration conflicts and keeps the "modular monolith" boundary real even though it's one codebase and one database — for a 2-person hackathon this is the safest way to avoid one person's schema change silently breaking the other's queries.

---

## 9. Frontend Integration (Ready to File → Applicant Details)

- **Routing:** P1's Ready-to-File screen is `/draft/:draft_id/ready`. On "File this RTI" click, frontend calls `POST /api/v1/rtis` with the Ready-to-File object. On success, router pushes to `/filing/:rti_id/applicant` (P2's first screen).
- **State transfer:** no client-side state passed between the two screens beyond the `rti_id` in the URL — P2's screen always re-fetches `GET /api/v1/rtis/{id}` on mount rather than relying on in-memory state from P1's screen. This keeps the boundary clean and refresh-safe.
- **Persistence:** the `POST /api/v1/rtis` call is what actually persists the object server-side; nothing is held only in frontend memory across the navigation.
- **Refresh behavior:** if the user refreshes on `/filing/:rti_id/applicant`, the screen re-fetches from `GET /api/v1/rtis/{id}` and continues — no data loss.
- **Back navigation:** browser back from Applicant Details returns to Ready-to-File (P1's screen), which itself re-fetches the draft by `draft_id` from the URL rather than relying on stale state.
- **Error handling:** if `POST /api/v1/rtis` fails (422 contract mismatch, 500 server error), P1's screen stays on Ready-to-File and shows the error inline — it never navigates forward on failure.

---

## 10. Git and Branch Strategy

```
main                        — always deployable, protected
develop                      — integration branch, merged into daily
feature/person1-intent
feature/person1-authority
feature/person1-draft
feature/person2-filing
feature/person2-dashboard
```

- Branch per feature/screen, not per person — keeps merges small.
- Merge into `develop` at least once per day (end of day), reviewed by the other person (quick read, not a blocking formal review — 2-person team, keep it light).
- `develop` merges into `main` after each checkpoint milestone (end of Day 2, 4, 6) once the checkpoint's demo works.
- Conflicts avoided by the ownership matrix (section 1) — if both touch the same file, it's almost always `docs/contracts.md`, `schemas/rti_contract.py`, or shared Tailwind config; edit those only during joint sessions.
- Interfaces (contracts) freeze at end of Day 1 and again fully at Day 4 integration — after Day 4, no changes to the Ready-to-File object shape without a joint 5-minute conversation.
- Stop refactoring shared contracts after Day 4; internal refactors within one's own slice are fine through Day 5.

---

## 11. Daily Checkpoints

**End of Day 1:** Repo, schema, Docker, contracts all committed. Both can independently run their half locally.
**End of Day 2:** P1 — text input → mocked suitability → mocked authority, click-through works. P2 — mocked Ready-to-file object → filing → mock payment → mock submission works.
**End of Day 3:** P1 — real AI draft flow works. P2 — RTI lifecycle + dashboard works (on mock input).
**End of Day 4:** Full journey works end-to-end, real integration, unpolished.
**End of Day 5:** Polished error/loading states both sides; visual consistency pass done.
**End of Day 6:** All 3 demo scenarios run reliably back-to-back with reset.
**End of Day 7:** Deployed, documented, rehearsed, frozen.

---

## 12. Integration Day Procedure (Day 4 morning)

1. Pull latest `develop`, both people, confirm clean local build.
2. Verify shared schemas — diff `schemas/rti_contract.py` (backend) against `types/rti.ts` (frontend) for drift since Day 1.
3. Connect P1's Ready-to-File screen to call real `POST /api/v1/rtis` instead of P2's static fixture.
4. Run happy path — demo scenario 1 (ideal journey) end to end, both watching.
5. Run failure cases — demo scenario 2 (wrong jurisdiction, should never reach `POST /api/v1/rtis`), demo scenario 3 (bad request reformulation), plus a deliberate payment failure.
6. Fix contract mismatches found in steps 4–5 immediately, together.
7. Freeze the Ready-to-File API shape once step 5 passes cleanly.
8. Tag the commit `v0.1-mvp-integrated` in git.

---

## 13. Fallback Plan

**P1 one day behind:** cut authority manual-ranking polish and draft regenerate button; ship single-shot draft generation only; jurisdiction check stays rule-based only (already simplest form, nothing to cut there).
**P2 one day behind:** cut document upload UI first (assume no attachments for demo; core applicant→payment→review→submit remains), cut additional-fee state (skip straight from AWAITING_RESPONSE to RESPONSE_RECEIVED in demo scenario).
**AI integration fails:** fall back entirely to pre-written deterministic responses for all 3 demo scenarios (already required as fallback per architecture doc section 10) — demo proceeds without any live AI call if needed.
**Database integration fails:** run entirely on local docker-compose Postgres for the demo instead of hosted deployment — never depend on a managed cloud DB being reachable at demo time.
<br>
**Final deployment fails:** demo from localhost via docker-compose as the confirmed backup; laptop-based demo is always rehearsed in parallel with hosted deployment, never assume the hosted version is the only path.

---

## 14. MVP Cut Strategy

- **P0 (cannot demo without):** F1–F8 core flow, curated authority DB, 3 demo scenarios, mock payment/submission, dashboard, timeline, next-action, `/demo/reset`.
- **P1 (valuable):** AI fallback robustness, error states, mobile responsiveness, draft regenerate.
- **P2 (optional):** response completeness checker, draft autosave, >50 authorities, document upload.
- **P3 (cut immediately if behind):** additional-fee state, appeal-available state, manual authority ranking UI polish, multilingual anything.

---

## 15. Testing Ownership

- Unit tests, P1 domain (classification, jurisdiction, authority matching, char/validation rules) — **P1**, must exist by Day 3.
- Unit tests, P2 domain (status transitions, payment states, registration generation, dashboard queries, next-action) — **P2**, must exist by Day 3.
- API/contract tests (Ready-to-File shape, `POST /api/v1/rtis`) — **Joint**, must exist by Day 4 (written the morning of integration, section 12 step 2–3).
- AI output/schema validation tests + fallback trigger test — **P1**, must exist by Day 4.
- Frontend component tests — each owns their own screens, nice-to-have, not blocking.
- Integration test (draft→validate→create RTI→payment→submit→status) — **Joint**, must exist by Day 4.
- E2E demo-scenario script (all 3 scenarios) — **Joint**, must exist by Day 6.

---

## 16. Demo Ownership

**P1 demonstrates:** intent input, suitability/jurisdiction verdict, authority recommendation + reasoning, draft generation + explanation, quality check improvement.
**P2 demonstrates:** filing stepper, mock payment, confirmation + registration number, dashboard, status timeline, "what happens next."

**Handoff point in the live demo:** at the moment P1 clicks "File this RTI" on the Ready-to-File screen — narration passes from P1 to P2 at exactly that click, mirroring the real API handoff at `POST /api/v1/rtis`.

---

## 17. Final 48 Hours (Day 6–7)

- **Feature freeze:** start of Day 6, morning. No new features after this point, only what's in section 14 P0/P1.
- **Bug fixing:** Day 6 all day, Day 7 morning only.
- **UI polish:** Day 5 primarily, spillover into Day 6 morning only.
- **AI reliability:** confirmed working Day 6 morning (fallback trigger test run live).
- **Demo seeding:** `/demo/reset` finalized Day 6 morning, used for every rehearsal from then on.
- **Deployment:** Day 7 morning, with docker-compose backup confirmed working in parallel.
- **Presentation:** slides/talking points finalized Day 7 afternoon.
- **Rehearsal:** minimum 3 full run-throughs Day 6 evening + Day 7, both people present every time.
- Coding new features stops completely at start of Day 6 morning.

---

## 18. Final Definition of Done

- Complete happy path (demo scenario 1) runs end to end without manual intervention.
- Wrong-jurisdiction scenario (demo scenario 2) correctly flags and explains.
- Bad-request scenario (demo scenario 3) correctly reformulates.
- Payment failure path shows `PAYMENT_FAILED` and allows retry, no false success.
- AI failure path falls back cleanly, no crash, no broken UI.
- Dashboard lists all demo cases correctly.
- Status timeline renders correctly for every state in the state machine.
- Next-action text is correct for every state.
- `/demo/reset` reliably restores the known demo state.
- Deployed and reachable (with local docker-compose backup confirmed).
- README complete (setup, run, demo instructions).
- Architecture diagram exported and included in submission.

---

## 19. Final Team Operating Model

P1 owns everything before Ready-to-File; P2 owns everything from Ready-to-File onward — both own their full vertical slice (frontend, backend, data, tests). They work fully independently Day 1 (after the joint morning) through Day 3, sharing only the frozen contracts from Day 1. The single mandatory collaboration point is Day 4 morning integration (section 12); after that, collaboration is limited to short daily syncs and the Day 5 visual-consistency pass. Scope freezes at start of Day 6. Decisions on contract changes after Day 1 require a joint conversation before either person edits shared schema files. Blockers are escalated immediately in a live conversation rather than async — with only 2 people, no blocker should sit unresolved more than a few hours. The demo is protected by: mocks as a permanent fallback for AI, deterministic seeding via `/demo/reset`, a rehearsed local backup deployment, and a hard feature freeze two full days before submission.
