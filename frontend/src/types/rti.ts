// ─── Intent ───────────────────────────────────────────────────────────────────

export interface IntentRequest {
  text: string
}

export type RTICategory =
  | 'health' | 'education' | 'finance' | 'infrastructure'
  | 'environment' | 'agriculture' | 'defence' | 'social_welfare'
  | 'law_order' | 'technology' | 'other'

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
}

export interface AuthorityRecommendResponse {
  primary: AuthorityResult
  alternatives: AuthorityResult[]
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
