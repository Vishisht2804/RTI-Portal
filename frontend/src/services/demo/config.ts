/**
 * Demo Mode switch.
 *
 * When VITE_DEMO_MODE=true the whole frontend runs against the localStorage-backed
 * mock API in `../mockApi` — no FastAPI, PostgreSQL, OpenAI or any backend server
 * is contacted. When it is false (the default) every API call goes to the real
 * FastAPI backend exactly as before.
 *
 * This is the ONLY place the env var is read.
 */
export const DEMO_MODE: boolean =
  String(import.meta.env.VITE_DEMO_MODE ?? '').toLowerCase() === 'true'
