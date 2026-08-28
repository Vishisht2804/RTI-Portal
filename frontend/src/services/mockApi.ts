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
  addStatusEvent, findRti, nextId, registrationNumber, resetState,
  serializeRtiDetail, serializeRtiListItem, transition, withState,
  type DemoRti, type RtiStatus,
} from './demo/state'

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

interface MockAuthority {
  authority_id: number
  name: string
  jurisdiction: 'central' | 'state'
  category: string
  description: string
}

// Stable subset of `backend/app/db/seed.py`.
const MOCK_AUTHORITIES: MockAuthority[] = [
  { authority_id: 1, name: 'Ministry of Health and Family Welfare', jurisdiction: 'central', category: 'health', description: 'Apex body for health policy, national health programs, AIIMS, and central hospitals.' },
  { authority_id: 2, name: 'Central Drugs Standard Control Organisation (CDSCO)', jurisdiction: 'central', category: 'health', description: 'Regulates drugs, cosmetics, medical devices, and clinical trials.' },
  { authority_id: 3, name: 'Ministry of Education', jurisdiction: 'central', category: 'education', description: 'Oversees school and higher education policy, IITs, NITs, UGC, CBSE.' },
  { authority_id: 5, name: 'Ministry of Finance', jurisdiction: 'central', category: 'finance', description: 'Manages union budget, taxation, banking regulation, and economic policy.' },
  { authority_id: 9, name: 'Ministry of Railways (Indian Railways)', jurisdiction: 'central', category: 'infrastructure', description: 'Operates and plans Indian Railways network — trains, tracks, stations.' },
  { authority_id: 11, name: 'National Highways Authority of India (NHAI)', jurisdiction: 'central', category: 'infrastructure', description: 'Develops and maintains national highway network.' },
  { authority_id: 15, name: 'Ministry of Defence', jurisdiction: 'central', category: 'defence', description: 'Defence forces, DRDO, defence procurement and policy.' },
  { authority_id: 25, name: 'Ministry of Electronics and Information Technology (MeitY)', jurisdiction: 'central', category: 'technology', description: 'Digital India, IT policy, data protection, cybersecurity, Aadhaar.' },
  { authority_id: 31, name: 'Karnataka Department of Health and Family Welfare', jurisdiction: 'state', category: 'health', description: 'Karnataka state health department — district hospitals, PHCs, state health schemes.' },
  { authority_id: 32, name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)', jurisdiction: 'state', category: 'infrastructure', description: 'Bengaluru civic body — roads, drainage, waste, property tax, building permits.' },
  { authority_id: 33, name: 'Karnataka Department of Education', jurisdiction: 'state', category: 'education', description: 'Karnataka school education, SSLC, PUC, teacher recruitment.' },
  { authority_id: 35, name: 'Karnataka Public Works Department (PWD)', jurisdiction: 'state', category: 'infrastructure', description: 'Builds and maintains state roads, bridges, and government buildings in Karnataka.' },
]

function pickAuthorities(
  category: string,
  jurisdiction: 'central' | 'state',
): { primary: AuthorityResult; alternatives: AuthorityResult[] } {
  const pool = MOCK_AUTHORITIES.filter((a) => a.jurisdiction === jurisdiction)
  const inScope = pool.length ? pool : MOCK_AUTHORITIES
  const primarySrc =
    inScope.find((a) => a.category === category) ?? inScope[0]
  const altSrc = inScope.filter((a) => a.authority_id !== primarySrc.authority_id).slice(0, 2)

  const toResult = (a: MockAuthority, confidence: AuthorityResult['confidence']): AuthorityResult => ({
    authority_id: a.authority_id,
    name: a.name,
    jurisdiction: a.jurisdiction,
    category: a.category as AuthorityResult['category'],
    description: a.description,
    reason:
      confidence === 'high'
        ? `Best match for a ${a.category} query in the ${a.jurisdiction} jurisdiction.`
        : `Alternative ${a.jurisdiction} authority that may also hold relevant records.`,
    confidence,
  })

  return {
    primary: toResult(primarySrc, primarySrc.category === category ? 'high' : 'medium'),
    alternatives: altSrc.map((a) => toResult(a, 'low')),
  }
}

export async function analyzeIntent(req: IntentRequest): Promise<IntentResponse> {
  await delay()
  const q = req.text.toLowerCase()
  const isState = q.includes('karnataka') || q.includes('state')
  const isGrievance =
    /why hasn'?t|why has not|\bbuild\b|\bfix\b|\brepair\b/.test(q)

  if (isGrievance) {
    return {
      is_rti: false,
      category: 'infrastructure',
      jurisdiction_hint: 'central',
      summary:
        'Query appears to be a grievance about government inaction rather than an information request.',
      entities: ['hospital'],
      time_period: null,
      missing_information: ['specific location', 'relevant authority', 'time period'],
      original_query: req.text,
      jurisdiction: 'central',
      is_rti_suitable: false,
      suitability_explanation:
        'This reads as a grievance about government inaction rather than a request for existing records. The RTI Act covers access to information, not demands for action.',
      reformulation_suggestion:
        "Rephrase as a request for records — e.g. 'Provide copies of all sanction orders, work orders, and inspection reports for the project between <start date> and <end date>.'",
      used_fallback: true,
    }
  }

  if (isState) {
    return {
      is_rti: true,
      category: 'health',
      jurisdiction_hint: 'state',
      summary: 'Seeking information about Karnataka state government hospital expenditure.',
      entities: ['Karnataka', 'state hospitals'],
      time_period: null,
      missing_information: [],
      original_query: req.text,
      jurisdiction: 'state',
      is_rti_suitable: true,
      suitability_explanation:
        'This concerns a State Government authority. RTI still applies, but the application must be filed with the State Public Information Officer or the relevant state RTI portal.',
      reformulation_suggestion: null,
      used_fallback: true,
    }
  }

  return {
    is_rti: true,
    category: 'health',
    jurisdiction_hint: 'central',
    summary:
      "Seeking information about the Ministry of Health's budget allocation and expenditure on government hospitals in 2025.",
    entities: ['Ministry of Health and Family Welfare', 'government hospitals'],
    time_period: '2025',
    missing_information: [],
    original_query: req.text,
    jurisdiction: 'central',
    is_rti_suitable: true,
    suitability_explanation:
      'This query seeks records held by a central public authority and is well-suited to an RTI application.',
    reformulation_suggestion: null,
    used_fallback: true,
  }
}

export async function recommendAuthority(
  req: AuthorityRecommendRequest,
): Promise<AuthorityRecommendResponse> {
  await delay()
  const jurisdiction = req.jurisdiction === 'state' ? 'state' : 'central'
  return pickAuthorities(req.category, jurisdiction)
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
      otp_verified: false,
      applicant: null,
      documents: [],
      payments: [],
      status_events: [],
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
    return withState((state) => state.rtis.map(serializeRtiListItem))
  }
  if (path === '/rtis' && method === 'POST') {
    return createRTI(body as ReadyToFileObject)
  }
  if (path === '/demo/reset' || path === '/demo') {
    return resetDemo()
  }

  const m = path.match(/^\/rtis\/(\d+)(\/[a-z/]+)?$/)
  if (m) {
    const rtiId = Number(m[1])
    const sub = m[2] ?? ''

    return withState((state) => {
      const rti = findRti(state, rtiId)

      if (sub === '' && method === 'GET') return serializeRtiDetail(rti)

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
        return serializeRtiDetail(rti)
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
        rti.submitted_at = new Date().toISOString()
        transition(state, rti, 'SUBMITTED', { simulated: true })
        transition(state, rti, 'RECEIVED')
        transition(state, rti, 'FORWARDED')
        transition(state, rti, 'AWAITING_RESPONSE')
        return {
          registration_number: rti.registration_number,
          status: rti.status,
          simulated: true,
          message:
            'Prototype submission only. No real government system was contacted.',
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
