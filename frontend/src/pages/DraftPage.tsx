import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  ArrowRightIcon, ArrowLeftIcon, RefreshCcwIcon,
  CopyIcon, CheckIcon, InfoIcon, AlertCircleIcon, ZapIcon,
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { useWizard } from '../context/WizardContext'
import { generateDraft } from '../services/api'

const CHAR_LIMIT = 3000

export default function DraftPage() {
  const navigate = useNavigate()
  const { state, setDraft, setEditedText } = useWizard()
  const intent    = state.intentResult
  const authority = state.selectedAuthority
  const [apiError, setApiError] = useState('')
  const [copied, setCopied]     = useState(false)

  const draftText = state.editedDraftText ?? state.draftResult?.draft_text ?? ''
  const charCount = draftText.length
  const overLimit = charCount > CHAR_LIMIT

  useEffect(() => { if (!intent || !authority) navigate('/') }, [intent, authority, navigate])

  const mutation = useMutation({
    mutationFn: generateDraft,
    onSuccess:  (data) => { setDraft(data); setApiError('') },
    onError:    (err: Error) => setApiError(err.message),
  })

  const doGenerate = () => {
    if (!intent || !authority) return
    mutation.mutate({
      original_query: intent.original_query,
      category:       intent.category,
      entities:       intent.entities,
      time_period:    intent.time_period,
      authority_id:   authority.authority_id,
      authority_name: authority.name,
      jurisdiction:   authority.jurisdiction,
    })
  }

  // Auto-generate on first load
  useEffect(() => {
    if (!state.draftResult) doGenerate()
  }, [])  // eslint-disable-line

  const handleCopy = async () => {
    await navigator.clipboard.writeText(draftText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const charColor = overLimit
    ? 'text-red-600'
    : charCount > CHAR_LIMIT * 0.9
    ? 'text-orange-500'
    : 'text-slate-400'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps currentStep={4} />

      <div className="max-w-6xl w-full mx-auto px-6 lg:px-8 py-10 animate-slide-up">
        <div className="flex items-start justify-between flex-wrap gap-3 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">AI Draft</h2>
            <p className="text-slate-500 text-sm mt-1">
              Review and edit your RTI application. It will be sent to{' '}
              <span className="font-medium text-primary-700">{authority?.name}</span>.
            </p>
          </div>
          <button
            onClick={doGenerate}
            disabled={mutation.isPending}
            className="btn-secondary flex items-center gap-2 text-sm"
          >
            <RefreshCcwIcon size={14} /> Regenerate
          </button>
        </div>

        {mutation.isPending && !state.draftResult && (
          <div className="card flex justify-center py-16">
            <Spinner size="lg" label="GPT-4o is drafting your RTI application…" />
          </div>
        )}

        {apiError && !state.draftResult && (
          <ErrorMessage message={apiError} onRetry={doGenerate} />
        )}

        {state.draftResult && !mutation.isPending && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Draft textarea */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              <div className="relative">
                <textarea
                  className="input-base min-h-[480px] resize-y font-mono text-sm leading-relaxed"
                  value={draftText}
                  onChange={(e) => setEditedText(e.target.value)}
                />
                {overLimit && (
                  <div className="absolute bottom-3 left-3 right-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                    <AlertCircleIcon size={14} className="text-red-500 shrink-0" />
                    <span className="text-xs text-red-600">
                      Exceeds {CHAR_LIMIT.toLocaleString()} character limit. Please shorten the draft.
                    </span>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono ${charColor}`}>
                  {charCount.toLocaleString()} / {CHAR_LIMIT.toLocaleString()} chars
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors font-medium"
                >
                  {copied ? <><CheckIcon size={12} className="text-emerald-500" /> Copied!</> : <><CopyIcon size={12} /> Copy draft</>}
                </button>
              </div>
            </div>

            {/* Right panel */}
            <div className="flex flex-col gap-4">
              {/* AI explanation */}
              {state.draftResult.explanation && (
                <div className="card border-l-4 border-primary-500">
                  <div className="flex items-center gap-2 mb-2">
                    <ZapIcon size={14} className="text-primary-600" />
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Why it's phrased this way
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {state.draftResult.explanation}
                  </p>
                </div>
              )}

              {/* Missing information */}
              {state.draftResult.missing_information.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <InfoIcon size={14} className="text-amber-600" />
                    <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                      Could strengthen this RTI
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {state.draftResult.missing_information.map((m, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                        <span className="mt-0.5">•</span> {m}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Authority summary */}
              <div className="card">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Filing to</p>
                <p className="font-semibold text-slate-700 text-sm">{authority?.name}</p>
                <p className="text-xs text-slate-500 mt-0.5 capitalize">{authority?.jurisdiction} Government</p>
              </div>

              {state.draftResult.used_fallback && (
                <p className="text-xs text-slate-400 text-center">⚡ Using cached draft (AI unavailable)</p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        {(state.draftResult || apiError) && (
          <div className="flex gap-3 mt-6">
            <button onClick={() => navigate('/authority')} className="btn-secondary flex items-center gap-2">
              <ArrowLeftIcon size={16} /> Back
            </button>
            <button
              onClick={() => navigate('/quality-check')}
              disabled={!state.draftResult || overLimit || mutation.isPending}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              Run Quality Check <ArrowRightIcon size={16} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
