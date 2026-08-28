import axios from 'axios'
import type {
  IntentRequest, IntentResponse,
  AuthorityRecommendRequest, AuthorityRecommendResponse,
  DraftGenerateRequest, DraftGenerateResponse,
  DraftValidateRequest, DraftValidateResponse,
  ReadyToFileObject, RTICreateResponse,
} from '../types/rti'
import { DEMO_MODE } from './demo/config'
import * as mockApi from './mockApi'

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
//
// Each function keeps the exact same signature. When DEMO_MODE is on it delegates
// to the localStorage-backed mock in ./mockApi; otherwise it hits FastAPI as before.

export const analyzeIntent = (req: IntentRequest): Promise<IntentResponse> =>
  DEMO_MODE
    ? mockApi.analyzeIntent(req)
    : api.post<IntentResponse>('/intent/analyze', req).then((r) => r.data)

export const recommendAuthority = (req: AuthorityRecommendRequest): Promise<AuthorityRecommendResponse> =>
  DEMO_MODE
    ? mockApi.recommendAuthority(req)
    : api.post<AuthorityRecommendResponse>('/authorities/recommend', req).then((r) => r.data)

export const generateDraft = (req: DraftGenerateRequest): Promise<DraftGenerateResponse> =>
  DEMO_MODE
    ? mockApi.generateDraft(req)
    : api.post<DraftGenerateResponse>('/drafts/generate', req).then((r) => r.data)

export const validateDraft = (req: DraftValidateRequest): Promise<DraftValidateResponse> =>
  DEMO_MODE
    ? mockApi.validateDraft(req)
    : api.post<DraftValidateResponse>('/drafts/validate', req).then((r) => r.data)

// ─── P2 handoff (P1 creates the object, P2 persists it) ─────────────────────

export const createRTI = (body: ReadyToFileObject): Promise<RTICreateResponse> =>
  DEMO_MODE
    ? mockApi.createRTI(body)
    : api.post<RTICreateResponse>('/rtis', body).then((r) => r.data)
