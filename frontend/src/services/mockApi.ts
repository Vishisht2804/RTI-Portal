/**
 * Frontend-only mock backend.
 *
 * Implements the exact request/response shapes the Track A and Track B UI already
 * expect (see `backend/app/schemas/*` and `backend/app/services/*`) without any
 * FastAPI / PostgreSQL / OpenAI dependency. All state lives in one localStorage
 * key via `./demo/state`.
 *
 * `api.ts` and `trackb/filing.tsx` delegate here when `DEMO_MODE` is true.
 */
import type {
  IntentRequest, IntentResponse,
  AuthorityRecommendRequest, AuthorityRecommendResponse, AuthorityResult,
  DraftGenerateRequest, DraftGenerateResponse,
  DraftValidateRequest, DraftValidateResponse,
  QualityChecks,
  ReadyToFileObject, RTICreateResponse,
} from '../types/rti'
import {
  DEMO_OTP, PAYMENT_AMOUNT,
  addStatusEvent, appealReferenceNumber, findRti, nextId, registrationNumber, resetState, seedReadyToFileRti,
  serializeRtiDetail, serializeRtiListItem, transition, withState,
  type DemoRti, type RtiStatus, type FirstAppeal,
} from './demo/state'
import { addDays, getDemoNow, daysOverdue as calcDaysOverdue, isOverdue as calcIsOverdue } from '../utils/deadline'
import { generateAppealText } from '../utils/appealGenerator'

// Small artificial latency so the UI's loading states still show.
const delay = (ms = 260) => new Promise((res) => setTimeout(res, ms))

// ════════════════════════════════════════════════════════════════════════════
// TRACK A — deterministic AI-free intake
// ════════════════════════════════════════════════════════════════════════════

const HEALTH_DRAFT = (authorityName: string) =>
  'To,\nThe Central Public Information Officer,\n' +
  `${authorityName},\nNew Delhi.\n\n` +
  'Subject: RTI Application under the Right to Information Act, 2005\n\n' +
  'I, the undersigned, hereby request the following information under Section 6 of the ' +
  'Right to Information Act, 2005:\n\n' +
  `1. The total budget sanctioned and actual expenditure incurred by ${authorityName} ` +
  'for government hospitals (Central Government hospitals) for the financial year 2024-25 ' +
  'and 2025-26 (till date).\n\n' +
  '2. The category-wise breakup of such expenditure including: (a) infrastructure and ' +
  'construction, (b) medical equipment and supplies, (c) salaries and personnel, ' +
  '(d) medicines and consumables.\n\n' +
  '3. The list of Central Government hospitals covered under this expenditure along with ' +
  'their location and patient capacity.\n\n' +
  '4. Any audit or inspection report conducted in respect of the above expenditure for ' +
  'the said period.\n\n' +
  'The information may be provided in the form of certified copies of relevant ' +
  'documents/records. Requisite fee of Rs. 10/- is enclosed herewith.\n\n' +
  'I declare that I am a citizen of India and this request is not motivated by commercial ' +
  'or personal gain.\n\nYours sincerely,\n[Applicant Name]'

const DRAFT_EXPLANATION =
  'This draft asks for budget and expenditure records under Section 6 of the RTI Act. ' +
  'It breaks the question into four specific sub-questions — budget allocation, ' +
  'category-wise breakup, list of hospitals, and audit reports — making it easier for the ' +
  "CPIO to locate and provide the exact records you need. Asking for 'certified copies' is " +
  'the correct RTI phrasing.'

import { analyzeQuery, scoreAuthorities, detectAmbiguity } from './demo/routing'

export async function analyzeIntent(req: IntentRequest): Promise<IntentResponse> {
  await delay()
  const s = analyzeQuery(req.text)

  const jurisdiction = s.jurisdiction
  const categoryWord = s.category === 'other' ? 'the requested subject' : s.category.replace('_', ' ')

  // ── Grievance branch — a complaint, not a records request ──────────────────
  if (s.isGrievance && !s.isInformationRequest) {
    return {
      is_rti: false,
      category: s.category === 'other' ? 'infrastructure' : s.category,
      jurisdiction_hint: jurisdiction,
      summary: `This reads as a request to get something fixed (${categoryWord}), not a request for records.`,
      entities: s.entities,
      time_period: s.timePeriod,
      missing_information: [],
      original_query: req.text,
      jurisdiction,
      is_rti_suitable: false,
      suitability_explanation:
        'The RTI Act gives you access to information the government already holds — it cannot compel an authority to take an action. This query asks for an action.',
      reformulation_suggestion:
        'Ask for records instead — for example: "Provide copies of all complaints received, work orders issued, and inspection reports for this location between <start date> and <end date>, and the current status of each."',
      used_fallback: false,
      grievance: {
        detected: true,
        fix_route_explanation:
          'To get the problem itself fixed, a public grievance is the right channel — the Centre runs CPGRAMS (pgportal.gov.in) and most states run their own grievance portals. RTI Navigator does not file grievances for you; this is guidance only.',
        rti_reframe:
          'RTI is still useful here: asking what the authority has recorded and done about the problem often gets it moving, and the reply is on the record.',
      },
    }
  }

  const suitable = true
  const summary = s.underspecified
    ? `Seeking ${categoryWord} information${s.entities.length ? ' related to ' + s.entities[0] : ''} — one detail is still needed to route it.`
    : `Seeking ${categoryWord} information${s.entities.length ? ' about ' + s.entities.slice(0, 2).join(' and ') : ''}${s.timePeriod ? ` for ${s.timePeriod}` : ''}.`

  return {
    is_rti: true,
    category: s.category,
    jurisdiction_hint: jurisdiction,
    summary,
    entities: s.entities,
    time_period: s.timePeriod,
    missing_information: s.underspecified ? ['which specific body / scheme the request concerns'] : [],
    original_query: req.text,
    jurisdiction,
    is_rti_suitable: suitable,
    suitability_explanation:
      jurisdiction === 'state'
        ? 'This concerns a State Government authority. RTI applies, but the application is filed with the State Public Information Officer or the state RTI portal.'
        : 'This asks for records held by a public authority and is well-suited to an RTI application.',
    reformulation_suggestion: null,
    used_fallback: false,
    grievance: null,
  }
}

export async function recommendAuthority(
  req: AuthorityRecommendRequest,
): Promise<AuthorityRecommendResponse> {
  await delay()
  const s = analyzeQuery(req.original_query || '')
  // Honour the jurisdiction the rules engine already decided
  if (req.jurisdiction === 'state' || req.jurisdiction === 'central') s.jurisdiction = req.jurisdiction
  if (req.category && req.category !== 'other') s.category = req.category

  const scored = scoreAuthorities(s, req.original_query || '')
  const ambiguity = detectAmbiguity(s, scored, req.original_query || '')

  // When the query is under-specified, no single authority should look certain
  // until the user answers the clarification. Keep displayed scores comparable.
  if (s.underspecified) {
    for (const a of scored) {
      a.confidence_score = Math.min(a.confidence_score, 66)
      a.confidence_level = a.confidence_score >= 50 ? 'medium' : 'low'
      a.confidence = a.confidence_level
    }
  }

  const primary = scored[0]
  const alternatives = scored.slice(1)

  return { primary, alternatives, ambiguity }
}

export async function generateDraft(
  req: DraftGenerateRequest,
): Promise<DraftGenerateResponse> {
  await delay(400)
  const draft_text = HEALTH_DRAFT(req.authority_name)
  return {
    draft_id: 9001,
    draft_text,
    explanation: DRAFT_EXPLANATION,
    missing_information: [],
    char_count: draft_text.length,
    used_fallback: true,
  }
}

// Deterministic port of `backend/app/rules/validation_rules.py`.
const CHAR_LIMIT = 3000
const ACTION_PHRASES = [
  'please take action', 'kindly do', 'fix the', 'repair the', 'build the',
  'i request you to', 'you are requested to take', 'take necessary steps',
  'ensure that', 'please ensure', 'you must', 'you should',
]
const VAGUE_PHRASES = [
  'all information', 'everything about', 'any and all', 'general information',
  'whatever you have', 'all records',
]
const INFO_MARKERS = [
  'please provide', 'i request', 'furnish', 'supply', 'disclose',
  'certified copies', 'inspection of', 'records relating', 'details of',
  'information regarding', 'status of', 'list of', 'amount spent',
  'expenditure', 'budget', 'sanctioned', 'approved', 'work order',
]
const TIME_MARKERS = [
  '2020', '2021', '2022', '2023', '2024', '2025', '2026',
  'financial year', 'fy ', 'f.y.', 'last year', 'last 3', 'last 5',
  'from', 'between', 'during',
]

export async function validateDraft(
  req: DraftValidateRequest,
): Promise<DraftValidateResponse> {
  await delay()
  const text = req.draft_text
  const lower = text.toLowerCase()
  const warnings: string[] = []

  let informationRequest = INFO_MARKERS.some((m) => lower.includes(m))
  if (!informationRequest) {
    warnings.push(
      "The draft does not clearly request specific records or information. Start with 'Please provide...' or 'I request certified copies of...'",
    )
  }
  const actionHit = ACTION_PHRASES.find((p) => lower.includes(p))
  if (actionHit) {
    informationRequest = false
    warnings.push(
      `The draft appears to request action ('${actionHit}') rather than information. RTI only covers requests for existing records, not demands for government action.`,
    )
  }

  let specificity = true
  const vagueHit = VAGUE_PHRASES.find((p) => lower.includes(p))
  if (vagueHit) {
    specificity = false
    warnings.push(
      `The draft is too vague ('${vagueHit}'). Specify the exact records, documents, or data points you need.`,
    )
  }
  if (text.trim().length < 100) {
    specificity = false
    warnings.push(
      'The draft is very short. Add more specific details: which records, which time period, which project or scheme.',
    )
  }
  if (!TIME_MARKERS.some((m) => lower.includes(m))) {
    warnings.push(
      "Consider adding a specific time period (e.g., 'for the financial year 2024–25'). This helps the authority locate the exact records you need.",
    )
  }

  const charCount = text.length
  const characterLimit = charCount <= CHAR_LIMIT
  if (!characterLimit) {
    warnings.push(
      `Draft exceeds the ${CHAR_LIMIT.toLocaleString()}-character limit (${charCount.toLocaleString()} characters). Shorten it before filing.`,
    )
  }

  const checks: QualityChecks = {
    authority: Boolean(req.authority_id) && req.authority_name.trim().length > 0,
    jurisdiction: req.jurisdiction === 'central' || req.jurisdiction === 'state',
    information_request: informationRequest,
    specificity,
    character_limit: characterLimit,
  }
  const allPassed = Object.values(checks).every(Boolean)

  return {
    valid: allPassed,
    validation_status: allPassed ? 'ready' : 'needs_review',
    checks,
    warnings,
    char_count: charCount,
    char_limit: CHAR_LIMIT,
  }
}

// ─── P1 → P2 handoff ────────────────────────────────────────────────────────

export async function createRTI(body: ReadyToFileObject): Promise<RTICreateResponse> {
  await delay()
  return withState((state) => {
    const id = nextId(state)
    const created = new Date().toISOString()
    const rti: DemoRti = {
      id,
      draft_id: body.draft_id,
      authority_id: body.authority_id,
      authority_name: body.authority_name,
      jurisdiction: body.jurisdiction,
      category: body.category,
      original_query: body.original_query,
      final_request: body.request_text,
      status: 'READY_TO_FILE',
      registration_number: null,
      created_at: created,
      submitted_at: null,
      response_due_at: null,
      otp_verified: false,
      applicant: null,
      documents: [],
      payments: [],
      status_events: [],
      first_appeal: null,
    }
    state.rtis.unshift(rti)
    addStatusEvent(state, rti, 'READY_TO_FILE', { source: 'ready_to_file_contract' })
    return { rti_id: id, status: rti.status }
  })
}

export async function resetDemo(): Promise<unknown> {
  await delay()
  const state = resetState()
  const seeded = state.rtis[0]
  return {
    status: 'ok',
    message: 'Demo state reset (frontend-only mock backend).',
    reset: true,
    demo_rti_id: seeded?.id ?? null,
    drafts_cleared: true,
  }
}

// ════════════════════════════════════════════════════════════════════════════
// TRACK B — generic request router (mirrors `trackb/filing.tsx` `api()`)
// ════════════════════════════════════════════════════════════════════════════

const ALLOWED_DOC_SUFFIXES = ['.pdf', '.png', '.jpg', '.jpeg']
const MAX_DOC_BYTES = 5 * 1024 * 1024
const DOC_UPLOAD_STATES: RtiStatus[] = [
  'FILING', 'PAYMENT_PENDING', 'PAYMENT_FAILED', 'PAYMENT_SUCCESS',
]

interface MockRequestOptions {
  method?: string
  body?: unknown
}

/** Drop-in replacement for the Track B `api()` fetch helper. `path` has no /api/v1 prefix. */
export async function mockRequest(path: string, options: MockRequestOptions = {}): Promise<any> {
  await delay(200)
  const method = (options.method ?? 'GET').toUpperCase()
  const body = (options.body ?? {}) as Record<string, any>

  // Collection
  if (path === '/rtis' && method === 'GET') {
    return withState((state) => state.rtis.map((r) => serializeRtiListItem(r, state.demo_now ?? null)))
  }
  if (path === '/rtis' && method === 'POST') {
    return createRTI(body as ReadyToFileObject)
  }
  if (path === '/demo/reset' || path === '/demo') {
    return resetDemo()
  }
  // Add a fresh Ready-to-File RTI so "file another" / "jump to filing" keeps
  // working after the previous RTI is submitted — no Demo reset required.
  if (path === '/demo/rti' && method === 'POST') {
    return { rti_id: seedReadyToFileRti(), status: 'READY_TO_FILE' }
  }

  // ── Demo time travel (clearly labelled prototype controls) ─────────────────
  if (path === '/demo/time' && method === 'GET') {
    return withState((state) => ({ demo_now: state.demo_now ?? null }))
  }
  if (path === '/demo/time/advance' && method === 'POST') {
    const days = Math.max(1, Math.min(365, Number(body.days ?? 7)))
    return withState((state) => {
      const base = state.demo_now ?? new Date().toISOString()
      state.demo_now = addDays(base, days)
      return { demo_now: state.demo_now }
    })
  }
  if (path === '/demo/time/reset' && method === 'POST') {
    return withState((state) => {
      state.demo_now = null
      return { demo_now: null }
    })
  }
  // Shortcut: fast-forward to 1 day past the first AWAITING_RESPONSE deadline
  if (path === '/demo/time/fastforward' && method === 'POST') {
    return withState((state) => {
      const candidate = state.rtis.find(
        (r) => r.status === 'AWAITING_RESPONSE' && r.response_due_at,
      )
      if (candidate?.response_due_at) {
        state.demo_now = addDays(candidate.response_due_at, 3)
      } else {
        const base = state.demo_now ?? new Date().toISOString()
        state.demo_now = addDays(base, 31)
      }
      return { demo_now: state.demo_now }
    })
  }

  const m = path.match(/^\/rtis\/(\d+)(\/[a-z/_]+)?$/)
  if (m) {
    const rtiId = Number(m[1])
    const sub = m[2] ?? ''

    return withState((state) => {
      const rti = findRti(state, rtiId)
      const demoNow = state.demo_now ?? null

      if (sub === '' && method === 'GET') return serializeRtiDetail(rti, demoNow)

      if (sub === '/applicant' && method === 'POST') {
        if (rti.status !== 'READY_TO_FILE') {
          throw new Error('Applicant details can only be added before filing starts.')
        }
        rti.applicant = {
          id: nextId(state),
          name: String(body.name ?? ''),
          email: String(body.email ?? ''),
          phone: String(body.phone ?? ''),
        }
        transition(state, rti, 'FILING')
        transition(state, rti, 'PAYMENT_PENDING')
        return serializeRtiDetail(rti, demoNow)
      }

      if (sub === '/otp/send' && method === 'POST') {
        return { sent: true, otp: DEMO_OTP, message: 'Demo OTP only. No SMS was sent.' }
      }

      if (sub === '/otp/verify' && method === 'POST') {
        if (String(body.otp) !== DEMO_OTP) {
          throw new Error('Use demo OTP 123456 for this prototype.')
        }
        rti.otp_verified = true
        return { verified: true, message: 'Demo OTP accepted.' }
      }

      if (sub === '/payment' && method === 'POST') {
        if (rti.status === 'PAYMENT_FAILED') transition(state, rti, 'PAYMENT_PENDING')
        if (rti.status !== 'PAYMENT_PENDING') {
          throw new Error('Payment can only be attempted while payment is pending or failed.')
        }
        const result: 'SUCCESS' | 'FAILED' = body.force_result === 'FAILED' ? 'FAILED' : 'SUCCESS'
        rti.payments.push({
          id: nextId(state),
          status: result,
          amount: PAYMENT_AMOUNT,
          created_at: new Date().toISOString(),
        })
        transition(state, rti, result === 'SUCCESS' ? 'PAYMENT_SUCCESS' : 'PAYMENT_FAILED')
        return { status: result, amount: PAYMENT_AMOUNT, simulated: true }
      }

      if (sub === '/submit' && method === 'POST') {
        if (!rti.applicant) throw new Error('Complete applicant details before submitting.')
        if (!rti.otp_verified) throw new Error('Verify the demo OTP before submitting.')
        if (rti.status !== 'PAYMENT_SUCCESS') {
          throw new Error('Complete demo payment before submitting the RTI.')
        }
        rti.registration_number = registrationNumber(rti.id)
        // Use demo_now as submitted_at so time travel stays coherent
        const submittedAt = getDemoNow(demoNow)
        rti.submitted_at = submittedAt
        // Response is due 30 days after submission (RTI Act Section 7(1))
        rti.response_due_at = addDays(submittedAt, 30)
        transition(state, rti, 'SUBMITTED', { simulated: true })
        transition(state, rti, 'RECEIVED')
        transition(state, rti, 'FORWARDED')
        transition(state, rti, 'AWAITING_RESPONSE')
        return {
          registration_number: rti.registration_number,
          status: rti.status,
          response_due_at: rti.response_due_at,
          simulated: true,
          message: 'Prototype submission only. No real government system was contacted.',
        }
      }

      // ── First Appeal endpoints ─────────────────────────────────────────────
      if (sub === '/appeal/generate' && method === 'POST') {
        if (!rti.response_due_at) {
          throw new Error('RTI has not been submitted or has no deadline set.')
        }
        const now = getDemoNow(demoNow)
        if (!calcIsOverdue(rti.response_due_at, now)) {
          throw new Error('RTI is not yet overdue. Appeal can only be generated after the deadline.')
        }
        const overdueDays = calcDaysOverdue(rti.response_due_at, now)
        const generatedText = generateAppealText({
          authority_name: rti.authority_name,
          original_query: rti.original_query,
          final_request: rti.final_request,
          registration_number: rti.registration_number,
          submitted_at: rti.submitted_at,
          response_due_at: rti.response_due_at,
          applicant: rti.applicant,
          days_overdue: overdueDays,
          demo_now: demoNow,
        })
        const appeal: FirstAppeal = {
          generated_at: now,
          title: `First Appeal — ${rti.authority_name}`,
          reason: `No response received within 30 days of filing (${overdueDays} day${overdueDays !== 1 ? 's' : ''} overdue).`,
          generated_text: generatedText,
          // Preserve an earlier submission if the user re-generates after submitting.
          submitted_at: rti.first_appeal?.submitted_at ?? null,
          appeal_reference_number: rti.first_appeal?.appeal_reference_number ?? null,
        }
        rti.first_appeal = appeal
        return { first_appeal: appeal }
      }

      if (sub === '/appeal' && method === 'PATCH') {
        // Persist edited appeal text
        if (!rti.first_appeal) throw new Error('No appeal has been generated yet.')
        rti.first_appeal = { ...rti.first_appeal, generated_text: String(body.generated_text ?? '') }
        return { first_appeal: rti.first_appeal }
      }

      if (sub === '/appeal/submit' && method === 'POST') {
        // Simulated First Appeal submission. The RTI status stays AWAITING_RESPONSE;
        // only fields inside first_appeal change.
        if (!rti.first_appeal) {
          throw new Error('Generate the First Appeal before submitting it.')
        }
        if (rti.first_appeal.submitted_at) {
          // Idempotent — already submitted.
          return { first_appeal: rti.first_appeal, simulated: true }
        }
        rti.first_appeal = {
          ...rti.first_appeal,
          submitted_at: getDemoNow(demoNow),
          appeal_reference_number: appealReferenceNumber(rti.id),
        }
        return {
          first_appeal: rti.first_appeal,
          simulated: true,
          message:
            'Prototype First Appeal submission only. No real appellate authority or government system was contacted.',
        }
      }

      throw new Error(`Mock API: unhandled route ${method} ${path}`)
    })
  }

  throw new Error(`Mock API: unhandled route ${method} ${path}`)
}

/** Drop-in replacement for the Track B multipart document upload. */
export async function mockUploadDocument(formData: FormData): Promise<any> {
  await delay(200)
  const rtiId = Number(formData.get('rti_id'))
  const file = formData.get('file') as File | null
  const filename = file?.name ?? 'document'
  const size = file?.size ?? 0

  return withState((state) => {
    const rti = findRti(state, rtiId)
    const suffix = filename.slice(filename.lastIndexOf('.')).toLowerCase()
    if (!ALLOWED_DOC_SUFFIXES.includes(suffix)) {
      throw new Error('Upload a PDF, PNG, JPG, or JPEG document.')
    }
    if (size > MAX_DOC_BYTES) {
      throw new Error('Documents must be 5 MB or smaller for the demo.')
    }
    if (!DOC_UPLOAD_STATES.includes(rti.status)) {
      throw new Error('Documents can only be uploaded during filing.')
    }
    const doc = {
      id: nextId(state),
      filename,
      size,
      path: `local-demo://documents/${rti.id}/${filename}`,
      created_at: new Date().toISOString(),
    }
    rti.documents.push(doc)
    return { id: doc.id, filename: doc.filename, size: doc.size, path: doc.path }
  })
}
