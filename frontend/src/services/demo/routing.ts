/**
 * Deterministic, explainable demo routing engine (Track 1).
 *
 * No AI, no network. Everything here is a transparent rule set:
 *   1. `analyzeQuery`  — pulls signals out of the raw text (category, jurisdiction,
 *      entities, topic keywords, grievance vs information request).
 *   2. `scoreAuthorities` — a small weighted model that turns those signals into a
 *      0–100 "match confidence" per authority, with the exact reasons displayed.
 *   3. `detectAmbiguity` — flags when two authorities score close together and
 *      builds a clarification question.
 *
 * The score is a demo heuristic, not a calibrated probability. UI copy says
 * "match confidence" deliberately.
 */

import type {
  RTICategory, AuthorityResult, Ambiguity, AmbiguityOption,
} from '../../types/rti'

// ─── Authority registry (stable subset of backend/app/db/seed.py + pension bodies) ──

export interface MockAuthority {
  authority_id: number
  name: string
  jurisdiction: 'central' | 'state'
  category: RTICategory
  description: string
  /** Words that describe this authority's remit — used for scope matching. */
  scope: string[]
}

export const MOCK_AUTHORITIES: MockAuthority[] = [
  { authority_id: 1, name: 'Ministry of Health and Family Welfare', jurisdiction: 'central', category: 'health',
    description: 'Apex body for health policy, national health programmes, AIIMS, and central government hospitals.',
    scope: ['hospital', 'health', 'aiims', 'medical', 'doctor', 'disease', 'vaccine', 'clinic', 'patient', 'nhm', 'ayushman'] },
  { authority_id: 2, name: 'Central Drugs Standard Control Organisation (CDSCO)', jurisdiction: 'central', category: 'health',
    description: 'Regulates drugs, cosmetics, medical devices, and clinical trials.',
    scope: ['drug', 'medicine', 'clinical trial', 'cosmetic', 'medical device', 'pharma'] },
  { authority_id: 3, name: 'Ministry of Education', jurisdiction: 'central', category: 'education',
    description: 'School and higher education policy, IITs, NITs, UGC, CBSE.',
    scope: ['school', 'education', 'iit', 'nit', 'ugc', 'cbse', 'university', 'college', 'scholarship', 'mid-day meal', 'student'] },
  { authority_id: 5, name: 'Ministry of Finance', jurisdiction: 'central', category: 'finance',
    description: 'Union budget, taxation, banking regulation, and economic policy.',
    scope: ['budget', 'tax', 'gst', 'bank', 'loan', 'subsidy', 'expenditure', 'finance', 'income tax', 'customs'] },
  { authority_id: 9, name: 'Ministry of Railways (Indian Railways)', jurisdiction: 'central', category: 'infrastructure',
    description: 'Operates and plans the Indian Railways network — trains, tracks, stations.',
    scope: ['train', 'railway', 'rail', 'station', 'irctc', 'coach', 'platform'] },
  { authority_id: 11, name: 'National Highways Authority of India (NHAI)', jurisdiction: 'central', category: 'infrastructure',
    description: 'Develops and maintains the national highway network.',
    scope: ['highway', 'national highway', 'nh ', 'expressway', 'toll', 'road', 'flyover', 'tender'] },
  { authority_id: 15, name: 'Ministry of Defence', jurisdiction: 'central', category: 'defence',
    description: 'Defence forces, DRDO, defence procurement and policy.',
    scope: ['army', 'navy', 'air force', 'defence', 'drdo', 'military', 'soldier', 'weapon', 'procurement'] },
  { authority_id: 25, name: 'Ministry of Electronics and Information Technology (MeitY)', jurisdiction: 'central', category: 'technology',
    description: 'Digital India, IT policy, data protection, cybersecurity, Aadhaar.',
    scope: ['aadhaar', 'digital', 'it ', 'internet', 'cyber', 'data protection', 'software', 'upi', 'app'] },
  { authority_id: 40, name: "Employees' Provident Fund Organisation (EPFO)", jurisdiction: 'central', category: 'social_welfare',
    description: 'Provident fund, pension (EPS) and insurance for private and organised-sector employees.',
    scope: ['pf', 'provident fund', 'epf', 'eps', 'uan', 'employee pension', 'private company', 'withdrawal claim', 'employer'] },
  { authority_id: 41, name: 'Department of Pension & Pensioners’ Welfare', jurisdiction: 'central', category: 'social_welfare',
    description: 'Pension policy and grievances for retired Central Government employees and family pensioners.',
    scope: ['pension', 'retired', 'retirement', 'pensioner', 'family pension', 'government employee', 'superannuation', 'gratuity'] },
  { authority_id: 31, name: 'Karnataka Department of Health and Family Welfare', jurisdiction: 'state', category: 'health',
    description: 'Karnataka state health department — district hospitals, PHCs, state health schemes.',
    scope: ['hospital', 'health', 'phc', 'district hospital', 'karnataka health'] },
  { authority_id: 32, name: 'Bruhat Bengaluru Mahanagara Palike (BBMP)', jurisdiction: 'state', category: 'infrastructure',
    description: 'Bengaluru civic body — roads, drainage, waste, property tax, building permits.',
    scope: ['road', 'pothole', 'drain', 'garbage', 'waste', 'footpath', 'street light', 'property tax', 'bengaluru', 'bbmp'] },
  { authority_id: 33, name: 'Karnataka Department of Education', jurisdiction: 'state', category: 'education',
    description: 'Karnataka school education, SSLC, PUC, teacher recruitment.',
    scope: ['school', 'sslc', 'puc', 'teacher', 'karnataka education'] },
  { authority_id: 35, name: 'Karnataka Public Works Department (PWD)', jurisdiction: 'state', category: 'infrastructure',
    description: 'Builds and maintains state roads, bridges, and government buildings in Karnataka.',
    scope: ['road', 'bridge', 'state highway', 'government building', 'pwd', 'contractor'] },
]

const byId = (id: number) => MOCK_AUTHORITIES.find((a) => a.authority_id === id)!

// ─── Topic dictionary: keyword → category / entities / candidate authorities ──

interface Topic {
  id: string
  keywords: string[]
  category: RTICategory
  /** Canonical entity labels this topic implies. */
  entities: string[]
  /** Candidate authority ids, most relevant first (central set; state swap handled later). */
  authorities: number[]
}

const TOPICS: Topic[] = [
  { id: 'pension', keywords: ['pension', 'pensioner', 'retirement', 'retired', 'superannuation', 'family pension'],
    category: 'social_welfare', entities: ['pension'], authorities: [41, 40] },
  { id: 'pf', keywords: ['provident fund', 'pf ', ' pf', 'epf', 'epfo', 'uan', 'pf withdrawal', 'pf claim'],
    category: 'social_welfare', entities: ['provident fund', 'EPFO'], authorities: [40, 41] },
  { id: 'hospital', keywords: ['hospital', 'aiims', 'clinic', 'phc', 'health centre', 'health center'],
    category: 'health', entities: ['government hospitals'], authorities: [1, 31] },
  { id: 'health', keywords: ['health', 'medical', 'doctor', 'disease', 'vaccine', 'ayushman', 'nhm'],
    category: 'health', entities: ['health'], authorities: [1, 31] },
  { id: 'drugs', keywords: ['drug', 'medicine approval', 'clinical trial', 'medical device'],
    category: 'health', entities: ['drugs regulation'], authorities: [2, 1] },
  { id: 'school', keywords: ['school', 'mid-day meal', 'midday meal', 'cbse', 'sslc', 'teacher', 'student', 'scholarship'],
    category: 'education', entities: ['school education'], authorities: [3, 33] },
  { id: 'university', keywords: ['university', 'college', 'ugc', 'iit', 'nit', 'higher education'],
    category: 'education', entities: ['higher education'], authorities: [3, 33] },
  { id: 'budget', keywords: ['budget', 'expenditure', 'spend', 'spent', 'allocation', 'funds released', 'money spent'],
    category: 'finance', entities: ['budget / expenditure'], authorities: [5] },
  { id: 'tax', keywords: ['income tax', 'gst', 'tax refund', 'customs', 'tds'],
    category: 'finance', entities: ['taxation'], authorities: [5] },
  { id: 'highway', keywords: ['highway', 'national highway', 'expressway', 'toll', 'nhai'],
    category: 'infrastructure', entities: ['national highways'], authorities: [11, 35] },
  { id: 'railway', keywords: ['train', 'railway', 'railways', 'irctc', 'station platform', 'rail '],
    category: 'infrastructure', entities: ['railways'], authorities: [9] },
  { id: 'roads', keywords: ['road', 'pothole', 'street light', 'footpath', 'drainage', 'drain', 'garbage', 'flyover'],
    category: 'infrastructure', entities: ['local roads / civic works'], authorities: [32, 35] },
  { id: 'defence', keywords: ['army', 'navy', 'air force', 'defence', 'drdo', 'military', 'soldier'],
    category: 'defence', entities: ['defence'], authorities: [15] },
  { id: 'digital', keywords: ['aadhaar', 'digital india', 'cyber', 'data protection', 'upi', 'internet shutdown'],
    category: 'technology', entities: ['electronics & IT'], authorities: [25] },
]

// ─── Text helpers ────────────────────────────────────────────────────────────

const norm = (s: string) => ' ' + s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim() + ' '

const GRIEVANCE_MARKERS = [
  'please fix', 'please repair', 'fix the', 'repair the', 'is broken', 'not working',
  'kindly resolve', 'take action', 'do something about', 'has not been done', "hasn't been done",
  'why has not', "why hasn't", 'is very bad', 'is pathetic', 'complaint', 'grievance',
  'no water supply', 'no electricity', 'clean the', 'remove the', 'stop the',
]
const INFO_MARKERS = [
  'how much', 'how many', 'provide', 'list of', 'details of', 'status of', 'copy of',
  'copies of', 'total', 'what is the', 'furnish', 'expenditure', 'budget', 'records',
  'number of', 'break-up', 'breakup', 'tenders', 'sanctioned',
]
const STATE_MARKERS = ['karnataka', 'bengaluru', 'bangalore', 'bbmp', 'state government', 'sslc', 'puc', 'gram panchayat', 'municipal']
const GENERIC_ONLY = ['information', 'details', 'know', 'want', 'need', 'about', 'my', 'the', 'regarding', 'get', 'some']

export interface QuerySignals {
  category: RTICategory
  jurisdiction: 'central' | 'state'
  entities: string[]
  timePeriod: string | null
  topicIds: string[]
  matchedKeywords: string[]
  candidateAuthorityIds: number[]
  isGrievance: boolean
  isInformationRequest: boolean
  /** true when the query is too generic to name a subject (e.g. "info about my pension"). */
  underspecified: boolean
}

export function analyzeQuery(raw: string): QuerySignals {
  const t = norm(raw)

  // Topic detection
  const hitTopics: Topic[] = []
  const matchedKeywords: string[] = []
  for (const topic of TOPICS) {
    const hits = topic.keywords.filter((k) => t.includes(norm(k).trim()))
    if (hits.length) {
      hitTopics.push(topic)
      hits.forEach((h) => { if (!matchedKeywords.includes(h.trim())) matchedKeywords.push(h.trim()) })
    }
  }

  const isState = STATE_MARKERS.some((m) => t.includes(m))
  const jurisdiction: 'central' | 'state' = isState ? 'state' : 'central'

  const category: RTICategory = hitTopics[0]?.category ?? 'other'

  // Entities: topic entities + any capitalised multi-word "Ministry/Department of ..." phrase
  const entities: string[] = []
  hitTopics.forEach((tp) => tp.entities.forEach((e) => { if (!entities.includes(e)) entities.push(e) }))
  const ministryMatch = raw.match(/(Ministry|Department|Authority|Commission|Board)\s+of\s+[A-Z][A-Za-z&\s]+?(?=\s+(spend|spent|for|in|on|during|\?|$))/)
  if (ministryMatch) entities.unshift(ministryMatch[0].trim())
  matchedKeywords.filter((k) => k.length > 3 && !GENERIC_ONLY.includes(k)).slice(0, 4)
    .forEach((k) => { if (!entities.some((e) => e.toLowerCase().includes(k))) entities.push(k) })

  const yr = raw.match(/\b(20\d{2}(\s*[-–]\s*\d{2,4})?)\b|\bFY\s?20\d{2}([-–]\d{2})?\b/i)
  const timePeriod = yr ? yr[0].trim() : null

  const isGrievance = GRIEVANCE_MARKERS.some((m) => t.includes(m))
  const isInformationRequest = INFO_MARKERS.some((m) => t.includes(m))

  // Candidate authorities from topics, jurisdiction-adjusted
  let candidateAuthorityIds = Array.from(new Set(hitTopics.flatMap((tp) => tp.authorities)))
  if (isState) {
    candidateAuthorityIds = [
      ...candidateAuthorityIds.filter((id) => byId(id)?.jurisdiction === 'state'),
      ...candidateAuthorityIds.filter((id) => byId(id)?.jurisdiction === 'central'),
    ]
  }
  if (candidateAuthorityIds.length === 0) {
    // Fall back to any authority in the detected category / jurisdiction
    candidateAuthorityIds = MOCK_AUTHORITIES
      .filter((a) => a.category === category && (isState ? a.jurisdiction === 'state' : a.jurisdiction === 'central'))
      .map((a) => a.authority_id)
  }
  if (candidateAuthorityIds.length === 0) {
    candidateAuthorityIds = MOCK_AUTHORITIES
      .filter((a) => a.jurisdiction === jurisdiction).slice(0, 2).map((a) => a.authority_id)
  }

  const wordCount = raw.trim().split(/\s+/).length
  const meaningfulHits = matchedKeywords.filter((k) => !GENERIC_ONLY.includes(k))
  const underspecified =
    (wordCount <= 7 && meaningfulHits.length <= 1 && !timePeriod && !ministryMatch) ||
    (hitTopics.length > 0 && meaningfulHits.length <= 1 && !isInformationRequest && wordCount <= 9)

  return {
    category, jurisdiction, entities: entities.slice(0, 5), timePeriod,
    topicIds: hitTopics.map((tp) => tp.id), matchedKeywords: matchedKeywords.slice(0, 6),
    candidateAuthorityIds, isGrievance, isInformationRequest, underspecified,
  }
}

// ─── Weighted scoring model ──────────────────────────────────────────────────

const WEIGHTS = {
  category: 34,
  jurisdiction: 20,
  entity: 18,
  topicKeyword: 16,
  scope: 12,
}

const CATEGORY_LABEL: Record<RTICategory, string> = {
  health: 'Health', education: 'Education', finance: 'Finance / budget',
  infrastructure: 'Infrastructure', environment: 'Environment', agriculture: 'Agriculture',
  defence: 'Defence', social_welfare: 'Pension / welfare', law_order: 'Law & order',
  technology: 'Technology', other: 'General',
}

export interface ScoredAuthority extends AuthorityResult {}

export function scoreAuthority(auth: MockAuthority, s: QuerySignals, raw: string): ScoredAuthority {
  const t = norm(raw)
  let score = 0
  const reasoning: string[] = []
  const matched: string[] = []

  // 1. Category match
  if (auth.category === s.category && s.category !== 'other') {
    score += WEIGHTS.category
    reasoning.push(`Subject area matches: ${CATEGORY_LABEL[s.category]}`)
  } else if (auth.category === s.category) {
    score += 6
  }

  // 2. Jurisdiction match
  if (auth.jurisdiction === s.jurisdiction) {
    score += WEIGHTS.jurisdiction
    reasoning.push(`Jurisdiction matches: ${s.jurisdiction === 'central' ? 'Central' : 'State'} government`)
  } else {
    reasoning.push(`Different jurisdiction (${auth.jurisdiction}) — included as a fallback`)
  }

  // 3. Entity match
  const entityHits = s.entities.filter((e) =>
    auth.scope.some((w) => e.toLowerCase().includes(w) || w.includes(e.toLowerCase())) ||
    auth.name.toLowerCase().includes(e.toLowerCase()),
  )
  if (entityHits.length) {
    score += Math.min(WEIGHTS.entity, 9 * entityHits.length)
    reasoning.push(`Names something this body handles: ${entityHits.slice(0, 2).join(', ')}`)
    entityHits.forEach((e) => matched.push(e))
  }

  // 4. Topic keyword match (explicit keyword tied to this authority as a candidate)
  if (s.candidateAuthorityIds.includes(auth.authority_id) && s.matchedKeywords.length) {
    const rank = s.candidateAuthorityIds.indexOf(auth.authority_id)
    score += rank === 0 ? WEIGHTS.topicKeyword : Math.max(4, WEIGHTS.topicKeyword - 6 - rank * 2)
    reasoning.push(`Query keywords point here: ${s.matchedKeywords.slice(0, 3).join(', ')}`)
    s.matchedKeywords.slice(0, 4).forEach((k) => { if (!matched.includes(k)) matched.push(k) })
  }

  // 5. Authority-scope relevance (word overlap with the authority's remit)
  const scopeHits = auth.scope.filter((w) => t.includes(' ' + w.trim()))
  if (scopeHits.length) {
    score += Math.min(WEIGHTS.scope, 4 * scopeHits.length)
    reasoning.push(`Authority's stated remit covers: ${scopeHits.slice(0, 3).join(', ')}`)
    scopeHits.forEach((w) => { if (!matched.includes(w.trim())) matched.push(w.trim()) })
  }

  score = Math.max(4, Math.min(97, Math.round(score)))
  const level: 'high' | 'medium' | 'low' = score >= 75 ? 'high' : score >= 50 ? 'medium' : 'low'

  // Keep 3–5 reasons, most useful first
  const trimmed = reasoning.slice(0, 5)
  while (trimmed.length < 3) trimmed.push('General fit with the identified subject area')

  return {
    authority_id: auth.authority_id,
    name: auth.name,
    jurisdiction: auth.jurisdiction,
    category: auth.category,
    description: auth.description,
    reason: trimmed[0],
    confidence: level,
    confidence_score: score,
    confidence_level: level,
    reasoning: trimmed,
    matched_signals: Array.from(new Set(matched)).slice(0, 6),
  }
}

export function scoreAuthorities(s: QuerySignals, raw: string): ScoredAuthority[] {
  const pool = new Set<number>(s.candidateAuthorityIds)
  // add category peers so alternatives exist
  MOCK_AUTHORITIES
    .filter((a) => a.category === s.category && a.jurisdiction === s.jurisdiction)
    .forEach((a) => pool.add(a.authority_id))
  const scored = Array.from(pool)
    .map((id) => byId(id))
    .filter(Boolean)
    .map((a) => scoreAuthority(a, s, raw))
    .sort((x, y) => y.confidence_score - x.confidence_score)
  return scored.slice(0, 4)
}

// ─── Ambiguity detection ─────────────────────────────────────────────────────

const CLARIFY_TEXT: Record<string, { question: string; options: Array<{ id: string; label: string; hint?: string; authId: number }> }> = {
  pension: {
    question: 'Whose pension records do you need?',
    options: [
      { id: 'eps', label: 'I worked in a private / organised-sector company', hint: 'PF & EPS pension', authId: 40 },
      { id: 'govt', label: 'I am (or was) a Central Government employee', hint: 'Government pension', authId: 41 },
      { id: 'family', label: 'It is a family pension after a government pensioner', hint: 'Family pension', authId: 41 },
    ],
  },
  roads: {
    question: 'Which road are you asking about?',
    options: [
      { id: 'city', label: 'A city / neighbourhood road', hint: 'Municipal body', authId: 32 },
      { id: 'state', label: 'A state highway or inter-town road', hint: 'State PWD', authId: 35 },
      { id: 'nh', label: 'A national highway', hint: 'NHAI', authId: 11 },
    ],
  },
  hospital: {
    question: 'Which hospitals do you mean?',
    options: [
      { id: 'central', label: 'Central government hospitals / AIIMS', authId: 1 },
      { id: 'state', label: 'State-run district hospitals / PHCs', authId: 31 },
    ],
  },
}

export function detectAmbiguity(
  s: QuerySignals,
  scored: ScoredAuthority[],
  raw: string,
): Ambiguity | null {
  if (scored.length < 2) return null
  const [a, b] = scored
  const close = a.confidence_score - b.confidence_score <= 14 && a.confidence_score < 82
  const trigger = s.underspecified || close
  if (!trigger) return null

  // pick a clarification template by topic
  const topicKey = s.topicIds.find((id) => CLARIFY_TEXT[id]) ??
    (s.category === 'infrastructure' ? 'roads' : s.category === 'health' ? 'hospital' : undefined)
  const tpl = topicKey ? CLARIFY_TEXT[topicKey] : null

  const mk = (authId: number, label: string): AmbiguityOption => {
    const auth = byId(authId)
    const rec = scoreAuthority(auth, s, raw)
    // A confirmed answer removes the ambiguity → nudge confidence up and add the confirming reason
    rec.confidence_score = Math.min(95, rec.confidence_score + 16)
    rec.confidence_level = rec.confidence_score >= 75 ? 'high' : rec.confidence_score >= 50 ? 'medium' : 'low'
    rec.confidence = rec.confidence_level
    rec.reasoning = [`You confirmed: ${label.toLowerCase()}`, ...rec.reasoning].slice(0, 5)
    rec.reason = rec.reasoning[0]
    return { id: `${authId}`, label, authority_ids: [authId], recommendation: rec }
  }

  let options: AmbiguityOption[]
  if (tpl) {
    options = tpl.options.map((o) => mk(o.authId, o.label))
    // de-dupe options that resolve to the same authority, keep first label
    const seen = new Set<number>()
    options = options.filter((o) => {
      const id = o.authority_ids[0]
      if (seen.has(id)) return false
      seen.add(id); return true
    })
  } else {
    options = [a, b].map((r) => mk(r.authority_id, r.name))
  }

  return {
    detected: true,
    explanation:
      s.underspecified
        ? 'Your query could point to more than one authority. One detail lets us route it precisely.'
        : `${a.name} and ${b.name} scored close together for this query.`,
    clarification_question: tpl?.question ?? 'Which of these best describes what you need?',
    options,
  }
}
