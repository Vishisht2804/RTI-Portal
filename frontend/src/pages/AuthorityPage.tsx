import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckIcon } from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { AppFooter } from '../components/common/AppFooter'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { useWizard } from '../context/WizardContext'
import { recommendAuthority } from '../services/api'
import type { AuthorityResult, AmbiguityOption } from '../types/rti'

const scoreOf = (a: AuthorityResult) =>
  Number.isFinite(a.confidence_score)
    ? a.confidence_score
    : a.confidence === 'high' ? 85 : a.confidence === 'medium' ? 60 : 40

const levelLabel = (a: AuthorityResult) => {
  const s = scoreOf(a)
  return s >= 75 ? 'High confidence' : s >= 50 ? 'Medium confidence' : 'Low confidence'
}

function ConfidenceBar({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <div className="h-1 w-full max-w-[240px] rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
    </div>
  )
}

const Crumbs = () => (
  <Breadcrumb items={[
    { label: 'Home', to: '/' }, { label: 'Start a request', to: '/' }, { label: 'Authority' },
  ]} />
)

export default function AuthorityPage() {
  const navigate = useNavigate()
  const { state, setAuthority, setAmbiguityChoice } = useWizard()
  const intent = state.intentResult
  const [selectedId, setSelectedId] = useState<number | null>(
    state.selectedAuthority?.authority_id ?? null,
  )
  const [apiError, setApiError] = useState('')

  useEffect(() => { if (!intent) navigate('/') }, [intent, navigate])

  const mutation = useMutation({
    mutationFn: recommendAuthority,
    onSuccess: (data) => {
      setSelectedId(data.primary.authority_id)
      setAuthority(data, data.primary)
      setAmbiguityChoice(null)
    },
    onError: (err: Error) => setApiError(err.message),
  })

  useEffect(() => {
    if (!intent) return
    if (!state.authorityResult) {
      mutation.mutate({
        category: intent.category,
        entities: intent.entities,
        jurisdiction: intent.jurisdiction,
        original_query: intent.original_query,
      })
    }
  }, [])  // eslint-disable-line

  const authorityData = state.authorityResult
  const ambiguity = authorityData?.ambiguity ?? null
  const ambiguityResolved = Boolean(state.ambiguityChoiceId) || !ambiguity?.detected

  const allAuthorities = useMemo(
    () => (authorityData ? [authorityData.primary, ...authorityData.alternatives] : []),
    [authorityData],
  )

  const handleSelect = (auth: AuthorityResult) => {
    setSelectedId(auth.authority_id)
    if (authorityData) setAuthority(authorityData, auth)
  }

  const handleClarify = (opt: AmbiguityOption) => {
    if (!authorityData) return
    const chosen = opt.recommendation
    const rest = allAuthorities.filter((a) => a.authority_id !== chosen.authority_id)
    setAuthority(
      { ...authorityData, primary: chosen, alternatives: rest, ambiguity: { ...authorityData.ambiguity!, detected: false } },
      chosen,
    )
    setSelectedId(chosen.authority_id)
    setAmbiguityChoice(opt.id)
  }

  const handleContinue = () => {
    const selected = allAuthorities.find((a) => a.authority_id === selectedId)
    if (!selected || !authorityData) return
    setAuthority(authorityData, selected)
    navigate('/draft')
  }

  const primary = authorityData?.primary
  const plausibleAlts = authorityData
    ? authorityData.alternatives.filter((a) => scoreOf(a) >= 45)
    : []
  const showClarify = ambiguity?.detected && !ambiguityResolved

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps />

      <div className="page animate-slide-up">
        <Crumbs />

        {mutation.isPending && (
          <>
            <h1 className="page-title">Finding the record-holder…</h1>
            <div className="panel flex justify-center py-16 mt-8">
              <Spinner size="lg" label="Matching your request to an authority" />
            </div>
          </>
        )}

        {apiError && (
          <ErrorMessage
            message={apiError}
            onRetry={() => mutation.mutate({
              category: intent!.category, entities: intent!.entities,
              jurisdiction: intent!.jurisdiction, original_query: intent!.original_query,
            })}
          />
        )}

        {/* ── Ambiguity ─────────────────────────────────────────────────── */}
        {authorityData && !mutation.isPending && showClarify && ambiguity && (
          <>
            <h1 className="page-title">Which authority should receive this RTI?</h1>
            <p className="page-subtitle max-w-2xl">
              More than one authority appears plausible. We will not hide that uncertainty.
            </p>

            <div className="panel p-6 mt-8">
              <p className="eyebrow">Clarification needed</p>
              <h2 className="section-title mt-2">{ambiguity.clarification_question}</h2>
              <p className="text-sm text-slate-500 mt-1">Choose the option that best matches the records you want.</p>
            </div>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-6">
              <div className="grid gap-4">
                {ambiguity.options.map((opt, i) => (
                  <button
                    key={opt.id}
                    onClick={() => handleClarify(opt)}
                    className="panel p-5 text-left hover:border-primary-400 transition-colors"
                  >
                    <p className="eyebrow">Option {String.fromCharCode(65 + i)}</p>
                    <p className="text-[15px] font-semibold text-slate-900 mt-1.5">{opt.label}</p>
                    {opt.hint && <p className="text-sm text-slate-500 mt-1 leading-relaxed">{opt.hint}</p>}
                  </button>
                ))}
              </div>

              <aside className="panel p-6">
                <h3 className="section-title">Why this is ambiguous</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{ambiguity.explanation}</p>
                <p className="text-sm text-slate-600 mt-3 leading-relaxed">
                  A transparent clarification is safer than a confident but unsupported guess.
                </p>
              </aside>
            </div>
          </>
        )}

        {/* ── Recommendation ────────────────────────────────────────────── */}
        {authorityData && primary && !mutation.isPending && !showClarify && (
          <>
            <h1 className="page-title">We found the most likely record-holder.</h1>
            <p className="page-subtitle max-w-2xl">
              Your request is most likely handled by this public authority.
              {state.ambiguityChoiceId && ' Updated from your answer.'}
            </p>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
              <div>
                <div className="panel p-6">
                  <p className="eyebrow">{scoreOf(primary)}% match · {levelLabel(primary)}</p>
                  <h2 className="text-[22px] font-bold text-slate-900 mt-2 leading-snug">{primary.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Recommended public authority</p>
                  <div className="mt-3"><ConfidenceBar score={scoreOf(primary)} /></div>

                  {primary.description && (
                    <p className="text-[15px] text-slate-600 mt-4 leading-relaxed">{primary.description}</p>
                  )}

                  <ul className="mt-4 space-y-2">
                    {(primary.reasoning?.length ? primary.reasoning : [primary.reason].filter(Boolean)).map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[15px] text-slate-700">
                        <CheckIcon size={15} className="text-emerald-600 shrink-0 mt-1" />
                        <span className="leading-relaxed">{r}</span>
                      </li>
                    ))}
                  </ul>

                  {primary.matched_signals?.length > 0 && (
                    <p className="text-[13px] text-slate-500 mt-4">
                      <span className="font-medium text-slate-600">Matched signals: </span>
                      {primary.matched_signals.map((s) => s.toUpperCase()).join(' · ')}
                    </p>
                  )}
                </div>

                <button onClick={handleContinue} disabled={!selectedId} className="btn-primary w-full mt-4">
                  Use this authority
                </button>
                <button
                  onClick={() => navigate('/suitability')}
                  className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
                >
                  ← Back to suitability
                </button>
              </div>

              <aside>
                <div className="panel p-6">
                  <h3 className="section-title">Why this authority?</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    The routing decision combines jurisdiction, topic signals, and the type of record
                    requested. It is deterministic and explainable.
                  </p>
                  {primary.matched_signals?.length > 0 && (
                    <div className="divider mt-4 pt-4">
                      <p className="section-label mb-1.5">Matched signals</p>
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        {primary.matched_signals.map((s) => s.toUpperCase()).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>

                {plausibleAlts.length > 0 && (
                  <div className="mt-6">
                    <h3 className="section-title">Other possible authorities</h3>
                    <div className="grid gap-2 mt-3">
                      {plausibleAlts.map((alt) => (
                        <button
                          key={alt.authority_id}
                          onClick={() => handleSelect(alt)}
                          className={`panel p-4 text-left transition-colors ${
                            selectedId === alt.authority_id ? 'border-primary-500' : 'hover:border-slate-300'
                          }`}
                        >
                          <p className="text-sm font-semibold text-slate-900">{alt.name}</p>
                          <p className="text-[13px] text-slate-500 mt-0.5">
                            {scoreOf(alt)}% match · lower-confidence alternative
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </aside>
            </div>
          </>
        )}
      </div>
      <AppFooter />
    </div>
  )
}
