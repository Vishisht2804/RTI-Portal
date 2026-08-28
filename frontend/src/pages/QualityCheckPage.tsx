import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  CheckCircle2Icon, XCircleIcon, AlertTriangleIcon,
  ArrowRightIcon, ArrowLeftIcon, ShieldCheckIcon,
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { useWizard } from '../context/WizardContext'
import { validateDraft } from '../services/api'
import type { QualityChecks } from '../types/rti'

const CHECK_LABELS: Record<keyof QualityChecks, string> = {
  authority:           'Authority identified',
  jurisdiction:        'Jurisdiction determined',
  information_request: 'Information request is clear',
  specificity:         'Request is specific enough',
  character_limit:     'Within 3,000 character limit',
}

const CHECK_DESCRIPTIONS: Record<keyof QualityChecks, string> = {
  authority:           'A valid public authority has been selected to receive this RTI.',
  jurisdiction:        'Central or State jurisdiction has been determined.',
  information_request: 'The draft clearly asks for government records or information.',
  specificity:         'The request names specific documents, data, or a time period.',
  character_limit:     'The draft is within the statutory character limit for filing.',
}

function CheckItem({ name, passed }: { name: keyof QualityChecks; passed: boolean }) {
  return (
    <div className={`flex items-start gap-4 rounded-xl border p-4 transition-all
      ${passed ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="mt-0.5 shrink-0">
        {passed
          ? <CheckCircle2Icon size={20} className="text-emerald-600" />
          : <XCircleIcon size={20} className="text-red-500" />
        }
      </div>
      <div>
        <p className={`font-semibold text-sm ${passed ? 'text-emerald-800' : 'text-red-700'}`}>
          {CHECK_LABELS[name]}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">{CHECK_DESCRIPTIONS[name]}</p>
      </div>
    </div>
  )
}

export default function QualityCheckPage() {
  const navigate = useNavigate()
  const { state, setValidation } = useWizard()
  const intent    = state.intentResult
  const authority = state.selectedAuthority
  const draft     = state.draftResult
  const editedText = state.editedDraftText ?? draft?.draft_text ?? ''
  const [apiError, setApiError] = useState('')

  useEffect(() => { if (!intent || !authority || !draft) navigate('/') }, [intent, authority, draft, navigate])

  const mutation = useMutation({
    mutationFn: validateDraft,
    onSuccess:  (data) => { setValidation(data); setApiError('') },
    onError:    (err: Error) => setApiError(err.message),
  })

  const doValidate = () => {
    if (!intent || !authority || !draft) return
    mutation.mutate({
      draft_id:       draft.draft_id,
      draft_text:     editedText,
      authority_id:   authority.authority_id,
      authority_name: authority.name,
      jurisdiction:   authority.jurisdiction,
      category:       intent.category,
      original_query: intent.original_query,
    })
  }

  useEffect(() => {
    if (!state.validationResult) doValidate()
  }, [])  // eslint-disable-line

  const result  = state.validationResult
  const isReady = result?.validation_status === 'ready'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps currentStep={5} />

      <div className="max-w-4xl w-full mx-auto px-6 lg:px-8 py-10 animate-slide-up">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Quality Check</h2>
        <p className="text-slate-500 text-sm mb-6">
          Running 5 deterministic checks against RTI Act 2005 requirements.
        </p>

        {mutation.isPending && !result && (
          <div className="card flex justify-center py-12">
            <Spinner size="lg" label="Running quality checks…" />
          </div>
        )}

        {apiError && !result && <ErrorMessage message={apiError} onRetry={doValidate} />}

        {result && (
          <div className="flex flex-col gap-4">
            {/* Overall verdict */}
            <div className={`rounded-2xl border-2 p-5 flex items-center gap-4
              ${isReady ? 'bg-emerald-50 border-emerald-300' : 'bg-orange-50 border-orange-300'}`}>
              {isReady
                ? <ShieldCheckIcon size={36} className="text-emerald-600 shrink-0" />
                : <AlertTriangleIcon size={36} className="text-orange-500 shrink-0" />
              }
              <div>
                <p className={`font-bold text-lg ${isReady ? 'text-emerald-800' : 'text-orange-700'}`}>
                  {isReady ? 'Ready to File' : 'Needs Review'}
                </p>
                <p className="text-sm text-slate-600 mt-0.5">
                  {isReady
                    ? 'All checks passed. Your RTI application is ready for filing.'
                    : 'Some checks failed. You can still proceed, but consider fixing the issues.'}
                </p>
              </div>
              <div className="ml-auto text-right shrink-0">
                <p className="text-2xl font-extrabold text-slate-700">
                  {Object.values(result.checks).filter(Boolean).length}
                  <span className="text-base font-normal text-slate-400">/5</span>
                </p>
                <p className="text-xs text-slate-400">checks passed</p>
              </div>
            </div>

            {/* Individual checks */}
            <div className="flex flex-col gap-2">
              {(Object.keys(result.checks) as (keyof QualityChecks)[]).map((key) => (
                <CheckItem key={key} name={key} passed={result.checks[key]} />
              ))}
            </div>

            {/* Char count */}
            <div className="card text-sm flex justify-between items-center py-3">
              <span className="text-slate-500">Character count</span>
              <span className={`font-mono font-semibold ${result.char_count > result.char_limit ? 'text-red-600' : 'text-slate-700'}`}>
                {result.char_count.toLocaleString()} / {result.char_limit.toLocaleString()}
              </span>
            </div>

            {/* Warnings */}
            {result.warnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="font-semibold text-amber-800 text-sm mb-2">
                  ⚠️ {result.warnings.length} warning{result.warnings.length > 1 ? 's' : ''}
                </p>
                <ul className="flex flex-col gap-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                      <span className="shrink-0 mt-0.5">•</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Navigation */}
            <div className="flex gap-3 mt-2">
              <button onClick={() => navigate('/draft')} className="btn-secondary flex items-center gap-2">
                <ArrowLeftIcon size={16} /> Edit Draft
              </button>
              <button
                onClick={() => navigate('/ready-to-file')}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                {isReady ? 'File RTI' : 'Continue Anyway'}
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
