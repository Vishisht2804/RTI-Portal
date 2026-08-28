import axios from 'axios'
import type {
  IntentRequest, IntentResponse,
  AuthorityRecommendRequest, AuthorityRecommendResponse,
  DraftGenerateRequest, DraftGenerateResponse,
  DraftValidateRequest, DraftValidateResponse,
  ReadyToFileObject, RTICreateResponse,
} from '../types/rti'

const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err.response?.data?.detail ?? err.message ?? 'Network error'
    return Promise.reject(new Error(msg))
  }
)

// ─── P1 endpoints ─────────────────────────────────────────────────────────────

export const analyzeIntent = (req: IntentRequest): Promise<IntentResponse> =>
  api.post<IntentResponse>('/intent/analyze', req).then((r) => r.data)

export const recommendAuthority = (req: AuthorityRecommendRequest): Promise<AuthorityRecommendResponse> =>
  api.post<AuthorityRecommendResponse>('/authorities/recommend', req).then((r) => r.data)

export const generateDraft = (req: DraftGenerateRequest): Promise<DraftGenerateResponse> =>
  api.post<DraftGenerateResponse>('/drafts/generate', req).then((r) => r.data)

export const validateDraft = (req: DraftValidateRequest): Promise<DraftValidateResponse> =>
  api.post<DraftValidateResponse>('/drafts/validate', req).then((r) => r.data)

// ─── P2 handoff (P1 creates the object, P2 persists it) ─────────────────────

export const createRTI = (body: ReadyToFileObject): Promise<RTICreateResponse> =>
  api.post<RTICreateResponse>('/rtis', body).then((r) => r.data)

// ─── Demo reset ───────────────────────────────────────────────────────────────

export const resetDemo = (): Promise<unknown> =>
  api.post('/demo').then((r) => r.data)
