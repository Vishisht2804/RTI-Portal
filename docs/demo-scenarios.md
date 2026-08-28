# RTI Navigator — Demo Scenarios

Run `POST /api/v1/demo` before each demo to reset state.

---

## Scenario 1 — ✅ Perfect RTI (Central, Health)
**Query:**
> "How much did the Ministry of Health spend on government hospitals in 2025?"

**Expected flow:**
- F1: Category = health, Jurisdiction hint = central
- F2: ✅ RTI Suitable | Jurisdiction = Central Government
- F3: Recommended → Ministry of Health and Family Welfare (high confidence)
- F4: AI draft with 4 specific sub-questions about budget, breakup, hospitals list, audit
- F5: All 5 checks pass → "Ready to File"
- F6: Submit → P2 returns rti_id

**Key talking points for judges:**
- AI extracts intent, rules engine makes the final jurisdiction call (deterministic)
- Draft is phrased with correct RTI terminology ("certified copies", "Section 6")
- Character limit enforced automatically

---

## Scenario 2 — ⚠️ State Government (Karnataka)
**Query:**
> "What is the total expenditure on Karnataka state government hospitals for FY 2024-25?"

**Expected flow:**
- F2: ⚠️ State Government Matter — explains this goes to Karnataka State IC
- F3: Recommends → Karnataka Department of Health and Family Welfare
- F4: Draft generated (with note to file via Karnataka RTI portal)
- F5: All checks pass
- F6: Can still download / file manually

**Key talking points:**
- Jurisdiction is deterministic — "Karnataka" keyword → state, not a guess
- App still helps draft and guides — doesn't block the user

---

## Scenario 3 — ❌ Grievance (Not RTI)
**Query:**
> "Why hasn't the government built a hospital in my area?"

**Expected flow:**
- F2: ❌ Not RTI Suitable — "sounds like a grievance/complaint"
- Reformulation suggestion shown: "Ask for sanction orders, work orders, status reports"
- User can still continue ("Draft Anyway")
- F3–F5: Guided through drafting a reformulated RTI

**Key talking points:**
- RTI classifier catches the grievance pattern ("why hasn't") deterministically
- Graceful — we don't block, we educate and redirect
- Reformulation suggestion is actionable

---

## Fallback demo (no OpenAI key)
If `OPENAI_API_KEY` is empty or invalid, the fallback system activates automatically.
- Scenario 1 uses `FALLBACK_INTENT_HEALTH` + `FALLBACK_DRAFT_HEALTH`
- Scenario 2 uses `FALLBACK_INTENT_STATE`
- Scenario 3 uses `FALLBACK_INTENT_GRIEVANCE`
- All 5 quality checks still run (deterministic — no AI needed)

**The demo never crashes.**
