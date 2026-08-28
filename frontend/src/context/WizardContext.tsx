import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import type {
  WizardState, IntentResponse, AuthorityRecommendResponse,
  AuthorityResult, DraftGenerateResponse, DraftValidateResponse,
  RTICreateResponse,
} from '../types/rti'

const STORAGE_KEY = 'rti_wizard_state'

const defaultState: WizardState = {
  originalQuery: '',
  intentResult: null,
  authorityResult: null,
  selectedAuthority: null,
  draftResult: null,
  editedDraftText: null,
  validationResult: null,
  rtiCreateResult: null,
}

interface WizardContextType {
  state: WizardState
  setQuery:      (q: string) => void
  setIntent:     (r: IntentResponse) => void
  setAuthority:  (r: AuthorityRecommendResponse, selected: AuthorityResult) => void
  setDraft:      (r: DraftGenerateResponse) => void
  setEditedText: (t: string) => void
  setValidation: (r: DraftValidateResponse) => void
  setRTICreate:  (r: RTICreateResponse) => void
  reset:         () => void
}

const WizardContext = createContext<WizardContextType | null>(null)

function loadState(): WizardState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...defaultState, ...JSON.parse(raw) }
  } catch (_) {}
  return defaultState
}

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WizardState>(loadState)

  // Persist to localStorage on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  }, [state])

  const patch = useCallback((partial: Partial<WizardState>) =>
    setState((s) => ({ ...s, ...partial })), [])

  const ctx: WizardContextType = {
    state,
    setQuery:      (q) => patch({ originalQuery: q }),
    setIntent:     (r) => patch({ intentResult: r }),
    setAuthority:  (r, sel) => patch({ authorityResult: r, selectedAuthority: sel }),
    setDraft:      (r) => patch({ draftResult: r, editedDraftText: r.draft_text }),
    setEditedText: (t) => patch({ editedDraftText: t }),
    setValidation: (r) => patch({ validationResult: r }),
    setRTICreate:  (r) => patch({ rtiCreateResult: r }),
    reset:         () => { localStorage.removeItem(STORAGE_KEY); setState(defaultState) },
  }

  return <WizardContext.Provider value={ctx}>{children}</WizardContext.Provider>
}

export function useWizard(): WizardContextType {
  const ctx = useContext(WizardContext)
  if (!ctx) throw new Error('useWizard must be used inside <WizardProvider>')
  return ctx
}
