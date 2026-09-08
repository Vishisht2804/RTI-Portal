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
import { isHindiStreetlightDemo } from '../services/demo/routing'

const scoreOf = (a: AuthorityResult) =>
  Number.isFinite(a.confidence_score)
    ? a.confidence_score
    : a.confidence === 'high' ? 85 : a.confidence === 'medium' ? 60 : 40

const levelLabel = (a: AuthorityResult, hindi = false) => {
  if (hindi) return a.confidence === 'high' ? 'उच्च भरोसा' : a.confidence === 'medium' ? 'मध्यम भरोसा' : 'कम भरोसा'
  return a.confidence === 'high'
    ? 'High confidence'
    : a.confidence === 'medium' ? 'Medium confidence' : 'Low confidence'
}

function ConfidenceBar({ score }: { score: number }) {
  const tone = score >= 75 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-500' : 'bg-slate-400'
  return (
    <div className="h-1 w-full max-w-[240px] rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${tone}`} style={{ width: `${score}%` }} />
    </div>
  )
}

const Crumbs = ({ hindi }: { hindi: boolean }) => (
  <Breadcrumb items={[
    { label: hindi ? 'होम' : 'Home', to: '/' }, { label: hindi ? 'अनुरोध शुरू करें' : 'Start a request', to: '/' }, { label: hindi ? 'प्राधिकरण' : 'Authority' },
  ]} />
)

export default function AuthorityPage() {
  const navigate = useNavigate()
  const { state, setAuthority, setAmbiguityChoice } = useWizard()
  const intent = state.intentResult
  const isHindiDemo = isHindiStreetlightDemo(intent?.original_query ?? '')
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
    if (!authorityData) return
    const rest = allAuthorities.filter((a) => a.authority_id !== auth.authority_id)
    const updatedData = {
      ...authorityData,
      primary: auth,
      alternatives: rest,
      ambiguity: authorityData.ambiguity
        ? { ...authorityData.ambiguity, detected: false }
        : authorityData.ambiguity,
    }
    setSelectedId(auth.authority_id)
    setAuthority(updatedData, auth)
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
        <Crumbs hindi={isHindiDemo} />

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
            <h1 className="page-title">{isHindiDemo ? 'यह RTI किस प्राधिकरण को भेजी जानी चाहिए?' : 'Which authority should receive this RTI?'}</h1>
            <p className="page-subtitle max-w-2xl">
              {isHindiDemo ? 'एक से अधिक प्राधिकरण संभव लग सकते हैं। हम इस अनिश्चितता को छिपाएंगे नहीं।' : 'More than one authority appears plausible. We will not hide that uncertainty.'}
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
            <h1 className="page-title">{isHindiDemo ? 'हमें सबसे संभावित रिकॉर्ड-धारक मिल गया है।' : 'We found the most likely record-holder.'}</h1>
            <p className="page-subtitle max-w-2xl">
              {isHindiDemo ? 'आपका अनुरोध संभवतः इसी सार्वजनिक प्राधिकरण के पास है।' : 'Your request is most likely handled by this public authority.'}
              {state.ambiguityChoiceId && (isHindiDemo ? ' आपके उत्तर के आधार पर अपडेट किया गया है।' : ' Updated from your answer.')}
            </p>

            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
              <div>
                <div className="panel p-6">
                  <p className="eyebrow">{scoreOf(primary)}% {isHindiDemo ? 'मेल · ' : 'match · '}{levelLabel(primary, isHindiDemo)}</p>
                  <h2 className="text-[22px] font-bold text-slate-900 mt-2 leading-snug">{primary.name}</h2>
                  <p className="text-sm text-slate-500 mt-0.5">{isHindiDemo ? 'अनुशंसित सार्वजनिक प्राधिकरण' : 'Recommended public authority'}</p>
                  <div className="mt-3"><ConfidenceBar score={scoreOf(primary)} /></div>

                  {primary.description && (
                    <p className="text-[15px] text-slate-600 mt-4 leading-relaxed">{primary.description}</p>
                  )}

                  <ul className="mt-4 space-y-2">
                    {[primary.reason].map((r, i) => (
                      <li key={i} className="flex items-start gap-2 text-[15px] text-slate-700">
                        <CheckIcon size={15} className="text-emerald-600 shrink-0 mt-1" />
                        <span className="leading-relaxed">{r}</span>
                      </li>
                    ))}
                  </ul>

                  {primary.matched_signals?.length > 0 && (
                    <p className="text-[13px] text-slate-500 mt-4">
                      <span className="font-medium text-slate-600">{isHindiDemo ? 'मेल खाने वाले संकेत: ' : 'Matched signals: '}</span>
                      {primary.matched_signals.map((s) => s.toUpperCase()).join(' · ')}
                    </p>
                  )}
                </div>

                <button onClick={handleContinue} disabled={!selectedId} className="btn-primary w-full mt-4">
                  {isHindiDemo ? 'इस प्राधिकरण का उपयोग करें' : 'Use this authority'}
                </button>
                <button
                  onClick={() => navigate('/suitability')}
                  className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
                >
                  ← {isHindiDemo ? 'उपयुक्तता पर वापस जाएं' : 'Back to suitability'}
                </button>
              </div>

              <aside>
                <div className="panel p-6">
                  <h3 className="section-title">{isHindiDemo ? 'यह प्राधिकरण क्यों?' : 'Why this authority?'}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                    {isHindiDemo ? 'यह चयन अधिकार क्षेत्र, विषय संकेतों और मांगे गए रिकॉर्ड के प्रकार पर आधारित है। यह निर्णय निश्चित और समझाने योग्य है।' : authorityData.routing_explanation ?? 'The routing decision combines jurisdiction, topic signals, and the type of record requested. It is deterministic and explainable.'}
                  </p>
                  {primary.matched_signals?.length > 0 && (
                    <div className="divider mt-4 pt-4">
                      <p className="section-label mb-1.5">{isHindiDemo ? 'मेल खाने वाले संकेत' : 'Matched signals'}</p>
                      <p className="text-[13px] text-slate-600 leading-relaxed">
                        {primary.matched_signals.map((s) => s.toUpperCase()).join(' · ')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-6">
                    <h3 className="section-title">{isHindiDemo ? 'अन्य संभावित प्राधिकरण' : 'Other possible authorities'}</h3>
                    {plausibleAlts.length > 0 ? (
                      <>
                        <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                          {isHindiDemo ? 'इन प्राधिकरणों के पास भी संबंधित रिकॉर्ड हो सकते हैं। पहले इसी श्रेणी के विकल्प दिखाए गए हैं।' : 'These authorities may also hold relevant records. Same-category options are listed first.'}
                        </p>
                        <div className="grid gap-2 mt-3">
                          {plausibleAlts.map((alt) => (
                        <div
                          key={alt.authority_id}
                          className={`panel p-4 flex items-start gap-3 transition-colors ${
                            selectedId === alt.authority_id ? 'border-primary-500' : ''
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900">{alt.name}</p>
                            <p className="text-[13px] text-slate-500 mt-0.5">
                              {scoreOf(alt)}% match · {levelLabel(alt)}
                            </p>
                            {alt.description && (
                              <p className="text-[13px] text-slate-500 mt-1 leading-relaxed line-clamp-2">
                                {alt.description}
                              </p>
                            )}
                            <p className="text-[13px] text-slate-600 mt-2 leading-relaxed">{alt.reason}</p>
                          </div>
                          <button
                            onClick={() => handleSelect(alt)}
                            className="shrink-0 text-xs font-medium text-primary-700 border border-primary-300 hover:bg-primary-50 rounded-md px-3 py-1.5 transition-colors whitespace-nowrap"
                          >
                            {isHindiDemo ? 'इसके बजाय इसे चुनें' : 'Use this instead'}
                          </button>
                        </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">
                        {isHindiDemo ? 'कोई निकटता से मेल खाने वाला वैकल्पिक प्राधिकरण नहीं मिला।' : 'No closely matching alternative authority was identified.'}
                      </p>
                    )}
                  </div>
              </aside>
            </div>
          </>
        )}
      </div>
      <AppFooter />
    </div>
  )
}
