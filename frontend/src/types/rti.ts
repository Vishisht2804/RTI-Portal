// ─── Intent ───────────────────────────────────────────────────────────────────

export interface IntentRequest {
  text: string
}

export type RTICategory =
  | 'health' | 'education' | 'finance' | 'infrastructure'
  | 'environment' | 'agriculture' | 'defence' | 'social_welfare'
  | 'law_order' | 'technology' | 'other'

/** Grievance branch info — present when the query reads as a complaint, not a records request. */
export interface GrievanceInfo {
  detected: boolean
  /** Plain explanation of the "get it fixed" route (no real API is integrated). */
  fix_route_explanation: string
  /** How the same concern can be turned into a records request. */
  rti_reframe: string
}

export interface IntentResponse {
  is_rti: boolean
  category: RTICategory
  jurisdiction_hint: 'central' | 'state'
  summary: string
  entities: string[]
  time_period: string | null
  missing_information: string[]
  original_query: string
  // From rules engine
  jurisdiction: 'central' | 'state'
  is_rti_suitable: boolean
  suitability_explanation: string
  reformulation_suggestion: string | null
  used_fallback: boolean
  /** Present only when the query is a grievance rather than an information request. */
  grievance: GrievanceInfo | null
}

// ─── Authority ────────────────────────────────────────────────────────────────

export interface AuthorityRecommendRequest {
  category: RTICategory
  entities: string[]
  jurisdiction: 'central' | 'state'
  original_query: string
}

export interface AuthorityResult {
  authority_id: number
  name: string
  jurisdiction: 'central' | 'state'
  category: RTICategory
  description: string | null
  reason: string
  confidence: 'high' | 'medium' | 'low'
  // ─── Explainable routing (Track 1) ──────────────────────────────────────────
  /** 0–100 match-confidence score from the deterministic demo scoring model. */
  confidence_score: number
  /** Bucketed score. Mirrors `confidence` but derived from `confidence_score`. */
  confidence_level: 'high' | 'medium' | 'low'
  /** 3–5 concrete, human-readable reasons that add up to the score shown. */
  reasoning: string[]
  /** Keywords / entities from the query that matched this authority. */
  matched_signals: string[]
}

/** One answer to a clarification question, with the authority it points to. */
export interface AmbiguityOption {
  id: string
  label: string
  hint?: string
  /** Authority ids this option favours (first is the resolved primary). */
  authority_ids: number[]
  /** Fully-resolved recommendation to apply if this option is chosen. */
  recommendation: AuthorityResult
}

/** Ambiguity structure — populated when more than one authority is plausible. */
export interface Ambiguity {
  detected: boolean
  explanation: string
  clarification_question: string
  options: AmbiguityOption[]
}

export interface AuthorityRecommendResponse {
  primary: AuthorityResult
  alternatives: AuthorityResult[]
  /** null unless the query is genuinely ambiguous between authorities. */
  ambiguity: Ambiguity | null
}

// ─── Draft ────────────────────────────────────────────────────────────────────

export interface DraftGenerateRequest {
  original_query: string
  category: RTICategory
  entities: string[]
  time_period: string | null
  authority_id: number
  authority_name: string
  jurisdiction: 'central' | 'state'
}

export interface DraftGenerateResponse {
  draft_id: number
  draft_text: string
  explanation: string
  missing_information: string[]
  char_count: number
  used_fallback: boolean
}

export interface DraftValidateRequest {
  draft_id: number
  draft_text: string
  authority_id: number
  authority_name: string
  jurisdiction: 'central' | 'state'
  category: RTICategory
  original_query: string
}

export interface QualityChecks {
  authority: boolean
  jurisdiction: boolean
  information_request: boolean
  specificity: boolean
  character_limit: boolean
}

export interface DraftValidateResponse {
  valid: boolean
  validation_status: 'ready' | 'needs_review'
  checks: QualityChecks
  warnings: string[]
  char_count: number
  char_limit: number
}

// ─── RTI Contract (P1 → P2 handoff) ──────────────────────────────────────────

export interface ReadyToFileObject {
  draft_id: number
  authority_id: number
  authority_name: string
  jurisdiction: 'central' | 'state'
  category: RTICategory
  request_text: string
  original_query: string
  validation_status: 'ready' | 'needs_review'
  quality_checks: QualityChecks
  applicant: null
}

export interface RTICreateResponse {
  rti_id: number
  status: string
}

// ─── Wizard state ─────────────────────────────────────────────────────────────

export interface WizardState {
  originalQuery: string
  intentResult: IntentResponse | null
  authorityResult: AuthorityRecommendResponse | null
  selectedAuthority: AuthorityResult | null
  /** Id of the ambiguity option the user picked, if any (persisted across refresh). */
  ambiguityChoiceId: string | null
  draftResult: DraftGenerateResponse | null
  editedDraftText: string | null
  validationResult: DraftValidateResponse | null
  rtiCreateResult: RTICreateResponse | null
}

export const WIZARD_STEPS = [
  { id: 1, label: 'Your Query',   path: '/' },
  { id: 2, label: 'Suitability', path: '/suitability' },
  { id: 3, label: 'Authority',   path: '/authority' },
  { id: 4, label: 'Draft',       path: '/draft' },
  { id: 5, label: 'Review',      path: '/quality-check' },
  { id: 6, label: 'File',        path: '/ready-to-file' },
] as const

export const CATEGORY_LABELS: Record<RTICategory, string> = {
  health:        'Health',
  education:     'Education',
  finance:       'Finance',
  infrastructure:'Infrastructure',
  environment:   'Environment',
  agriculture:   'Agriculture',
  defence:       'Defence',
  social_welfare:'Social Welfare',
  law_order:     'Law & Order',
  technology:    'Technology',
  other:         'Other',
}
