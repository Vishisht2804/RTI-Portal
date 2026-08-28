/**
 * Single coherent demo application state, persisted in ONE localStorage key.
 *
 * This is a faithful TypeScript port of the Track B backend lifecycle
 * (`backend/app/services/lifecycle.py` + `rti_service.py`). The same mock RTI
 * object flows through Track A (intake) and Track B (filing) — nothing is
 * hardcoded per page.
 */

const STORAGE_KEY = 'rti_demo_state_v1'

// ─── Status model (mirrors backend RtiStatus) ────────────────────────────────

export type RtiStatus =
  | 'READY_TO_FILE'
  | 'FILING'
  | 'PAYMENT_PENDING'
  | 'PAYMENT_FAILED'
  | 'PAYMENT_SUCCESS'
  | 'SUBMITTED'
  | 'RECEIVED'
  | 'FORWARDED'
  | 'AWAITING_RESPONSE'
  | 'RESPONSE_RECEIVED'

const TRANSITIONS: Record<RtiStatus, RtiStatus[]> = {
  READY_TO_FILE: ['FILING'],
  FILING: ['PAYMENT_PENDING'],
  PAYMENT_PENDING: ['PAYMENT_FAILED', 'PAYMENT_SUCCESS'],
  PAYMENT_FAILED: ['PAYMENT_PENDING'],
  PAYMENT_SUCCESS: ['SUBMITTED'],
  SUBMITTED: ['RECEIVED'],
  RECEIVED: ['FORWARDED'],
  FORWARDED: ['AWAITING_RESPONSE'],
  AWAITING_RESPONSE: ['RESPONSE_RECEIVED'],
  RESPONSE_RECEIVED: [],
}

const EVENT_TEXT: Record<RtiStatus, [string, string]> = {
  READY_TO_FILE: ['Request prepared', 'The validated request was accepted into Track B for filing.'],
  FILING: ['Applicant details saved', 'Applicant information was recorded for the simulated filing.'],
  PAYMENT_PENDING: ['Payment required', 'The prototype is waiting for the demo application fee step.'],
  PAYMENT_FAILED: ['Payment failed', 'The simulated payment failed and can be retried.'],
  PAYMENT_SUCCESS: ['Payment completed', 'The demo payment was marked successful. No real money moved.'],
  SUBMITTED: ['Simulated submission completed', 'The prototype generated a demo registration number.'],
  RECEIVED: ['Received by demo portal', 'A synthetic acknowledgement event was created for the timeline.'],
  FORWARDED: ['Forwarded to authority', 'The simulated portal routed the RTI to the selected authority.'],
  AWAITING_RESPONSE: ['Under processing', 'No live government status is being fetched in this MVP.'],
  RESPONSE_RECEIVED: ['Response received', 'A synthetic response event is available for the demo case.'],
}

interface NextAction {
  title: string
  description: string
  action?: string
  action_url?: string
}

const NEXT_ACTIONS: Record<RtiStatus, NextAction> = {
  READY_TO_FILE: {
    title: 'Complete applicant details',
    description: 'Add applicant details to continue the filing flow.',
    action: 'continue',
    action_url: '/filing/{rti_id}/applicant',
  },
  FILING: {
    title: 'Continue filing',
    description: 'Review documents and continue to the demo payment step.',
    action: 'continue',
    action_url: '/filing/{rti_id}/documents',
  },
  PAYMENT_PENDING: {
    title: 'Complete demo payment',
    description: 'Complete the simulated application fee before submission.',
    action: 'pay',
    action_url: '/filing/{rti_id}/payment',
  },
  PAYMENT_FAILED: {
    title: 'Retry demo payment',
    description: 'The simulated payment failed. Retry before submitting.',
    action: 'retry_payment',
    action_url: '/filing/{rti_id}/payment',
  },
  PAYMENT_SUCCESS: {
    title: 'Review and submit',
    description: 'Payment is complete. Review the RTI before simulated submission.',
    action: 'review',
    action_url: '/filing/{rti_id}/review',
  },
  SUBMITTED: {
    title: 'Wait for processing',
    description:
      'Your request has been submitted in the prototype. No real government filing occurred.',
  },
  RECEIVED: { title: 'No action required', description: 'The demo portal has acknowledged the request.' },
  FORWARDED: { title: 'No action required', description: 'The request is shown as forwarded in the demo.' },
  AWAITING_RESPONSE: {
    title: 'No action required',
    description:
      'Wait for the authority response. This status is simulated for the prototype.',
  },
  RESPONSE_RECEIVED: {
    title: 'Review the response',
    description: 'A demo response is available for review.',
    action: 'review_response',
    action_url: '/rtis/{rti_id}',
  },
}

export function getNextAction(status: RtiStatus, rtiId: number): NextAction {
  const action = NEXT_ACTIONS[status] ?? {
    title: 'Check back later',
    description: 'The prototype does not have a mapped next action for this state.',
  }
  const data: NextAction = { ...action }
  if (data.action_url) data.action_url = data.action_url.replace('{rti_id}', String(rtiId))
  return data
}

export function registrationNumber(rtiId: number): string {
  const year = new Date().getFullYear()
  return `RTI/${year}/${String(rtiId).padStart(5, '0')}`
}

// ─── Persisted shapes (mirror backend `_serialize_rti`) ──────────────────────

export interface DemoStatusEvent {
  id: number
  status: RtiStatus
  title: string
  description: string
  timestamp: string
  metadata: Record<string, unknown>
}

export interface DemoDocument {
  id: number
  filename: string
  size: number
  path: string
  created_at: string
}

export interface DemoPayment {
  id: number
  status: 'SUCCESS' | 'FAILED'
  amount: number
  created_at: string
}

export interface DemoApplicant {
  id: number
  name: string
  email: string
  phone: string
}

export interface DemoRti {
  id: number
  draft_id: number
  authority_id: number
  authority_name: string
  jurisdiction: 'central' | 'state'
  category: string
  original_query: string
  final_request: string
  status: RtiStatus
  registration_number: string | null
  created_at: string
  submitted_at: string | null
  otp_verified: boolean
  applicant: DemoApplicant | null
  documents: DemoDocument[]
  payments: DemoPayment[]
  status_events: DemoStatusEvent[]
}

export interface DemoState {
  seq: number
  rtis: DemoRti[]
}

// ─── Persistence ────────────────────────────────────────────────────────────

export const DEMO_OTP = '123456'
export const PAYMENT_AMOUNT = 10

function nowIso(): string {
  return new Date().toISOString()
}

function seededRti(id: number): DemoRti {
  const created = nowIso()
  return {
    id,
    draft_id: 101,
    authority_id: 12,
    authority_name: 'Ministry of Health and Family Welfare',
    jurisdiction: 'central',
    category: 'health',
    original_query: 'How much did Ministry of Health spend on government hospitals in 2025?',
    final_request:
      'Please provide the sanctioned budget, expenditure incurred, current completion status, and completion date for government hospital infrastructure projects funded by the Ministry of Health and Family Welfare during 2025.',
    status: 'READY_TO_FILE',
    registration_number: null,
    created_at: created,
    submitted_at: null,
    otp_verified: false,
    applicant: null,
    documents: [],
    payments: [],
    status_events: [
      {
        id: id * 1000 + 1,
        status: 'READY_TO_FILE',
        title: EVENT_TEXT.READY_TO_FILE[0],
        description: EVENT_TEXT.READY_TO_FILE[1],
        timestamp: created,
        metadata: { source: 'ready_to_file_contract' },
      },
    ],
  }
}

export function initialState(): DemoState {
  return { seq: 2, rtis: [seededRti(1)] }
}

/**
 * Add a fresh Ready-to-File demo RTI and return its id. Lets the user file
 * another RTI (or "jump to filing") after the seeded one has been submitted,
 * without needing a full Demo reset.
 */
export function seedReadyToFileRti(): number {
  return withState((state) => {
    const id = nextId(state)
    state.rtis.unshift(seededRti(id))
    return id
  })
}

export function loadState(): DemoState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as DemoState
      if (parsed && Array.isArray(parsed.rtis)) return parsed
    }
  } catch {
    /* ignore corrupt state */
  }
  const fresh = initialState()
  saveState(fresh)
  return fresh
}

export function saveState(state: DemoState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — demo continues in-memory for this tab */
  }
}

export function resetState(): DemoState {
  const fresh = initialState()
  saveState(fresh)
  return fresh
}

/** Mutate + persist helper. */
export function withState<T>(fn: (state: DemoState) => T): T {
  const state = loadState()
  const result = fn(state)
  saveState(state)
  return result
}

export function nextId(state: DemoState): number {
  return state.seq++
}

// ─── Lifecycle helpers (mirror backend) ─────────────────────────────────────

export function addStatusEvent(
  state: DemoState,
  rti: DemoRti,
  status: RtiStatus,
  metadata: Record<string, unknown> = {},
): void {
  const [title, description] = EVENT_TEXT[status]
  rti.status_events.push({
    id: nextId(state),
    status,
    title,
    description,
    timestamp: nowIso(),
    metadata,
  })
}

export function transition(
  state: DemoState,
  rti: DemoRti,
  target: RtiStatus,
  metadata: Record<string, unknown> = {},
): void {
  if (!TRANSITIONS[rti.status].includes(target)) {
    throw new Error(`Cannot transition RTI ${rti.id} from ${rti.status} to ${target}.`)
  }
  rti.status = target
  addStatusEvent(state, rti, target, metadata)
}

export function findRti(state: DemoState, rtiId: number): DemoRti {
  const rti = state.rtis.find((r) => r.id === rtiId)
  if (!rti) throw new Error('The requested RTI was not found.')
  return rti
}

// ─── Serializers (mirror backend `_serialize_rti` / `list_rtis`) ─────────────

export function serializeRtiDetail(rti: DemoRti) {
  const latest = rti.status_events[rti.status_events.length - 1]
  return {
    id: rti.id,
    registration_number: rti.registration_number,
    authority_id: rti.authority_id,
    authority_name: rti.authority_name,
    jurisdiction: rti.jurisdiction,
    category: rti.category,
    original_query: rti.original_query,
    final_request: rti.final_request,
    status: rti.status,
    created_at: rti.created_at,
    submitted_at: rti.submitted_at,
    applicant: rti.applicant
      ? {
          id: rti.applicant.id,
          name: rti.applicant.name,
          email: rti.applicant.email,
          phone: rti.applicant.phone,
        }
      : null,
    documents: rti.documents.map((d) => ({
      id: d.id,
      filename: d.filename,
      size: d.size,
      path: d.path,
      created_at: d.created_at,
    })),
    payments: rti.payments.map((p) => ({
      id: p.id,
      status: p.status,
      amount: p.amount,
      created_at: p.created_at,
    })),
    status_events: rti.status_events.map((e) => ({
      id: e.id,
      status: e.status,
      title: e.title,
      description: e.description,
      timestamp: e.timestamp,
      metadata: e.metadata ?? {},
    })),
    last_update: latest ? latest.timestamp : rti.created_at,
    next_action: getNextAction(rti.status, rti.id),
  }
}

export function serializeRtiListItem(rti: DemoRti) {
  const latest = rti.status_events[rti.status_events.length - 1]
  return {
    id: rti.id,
    registration_number: rti.registration_number,
    authority_name: rti.authority_name,
    subject: rti.original_query.slice(0, 96),
    status: rti.status,
    last_update: latest ? latest.timestamp : rti.created_at,
    next_action: getNextAction(rti.status, rti.id),
  }
}
