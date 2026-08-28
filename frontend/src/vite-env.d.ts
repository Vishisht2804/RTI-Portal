/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** When "true", the frontend runs entirely on the localStorage-backed mock API. */
  readonly VITE_DEMO_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
