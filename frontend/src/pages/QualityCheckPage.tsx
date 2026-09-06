import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckIcon, XIcon, ArrowRightIcon, ArrowLeftIcon } from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { AppFooter } from '../components/common/AppFooter'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { useWizard } from '../context/WizardContext'
import { validateDraft } from '../services/api'
import type { QualityChecks } from '../types/rti'

const CHECK_LABELS: Record<keyof QualityChecks, string> = {
  authority:           'Authority identified',
  jurisdiction:        'Jurisdiction determined',
  information_request: 'Clearly asks for information',
  specificity:         'Specific enough to act on',
  character_limit:     'Within the 3,000-character limit',
}

const CHECK_DESCRIPTIONS: Record<keyof QualityChecks, string> = {
  authority:           'A valid public authority has been selected to receive this request.',
  jurisdiction:        'Central or state jurisdiction has been determined.',
  information_request: 'The text asks for government records or information, not for an action.',
  specificity:         'The request names specific documents, data, or a time period.',
  character_limit:     'The text is within the statutory limit for filing.',
}

function CheckItem({ name, passed }: { name: keyof QualityChecks; passed: boolean }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
      <span
        className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center shrink-0
          ${passed ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}
      >
        {passed ? <CheckIcon size={13} /> : <XIcon size={13} />}
      </span>
      <div>
        <p className="text-sm font-medium text-slate-800">{CHECK_LABELS[name]}</p>
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
      <ProgressSteps />

      <div className="page animate-slide-up">
       <div className="max-w-[760px] mx-auto">
        <Breadcrumb items={[
          { label: 'Home', to: '/' }, { label: 'Draft', to: '/draft' }, { label: 'Review' },
        ]} />
        <h1 className="page-title">Review your request.</h1>
        <p className="page-subtitle mb-8">
          Five checks against the requirements of the RTI Act, 2005.
        </p>

        {mutation.isPending && !result && (
          <div className="panel flex justify-center py-12">
            <Spinner size="lg" label="Running checks…" />
          </div>
        )}

        {apiError && !result && <ErrorMessage message={apiError} onRetry={doValidate} />}

        {result && (
          <div className="flex flex-col gap-5">
            <div className={`panel p-5 border-l-2 ${isReady ? 'border-l-emerald-500' : 'border-l-amber-500'}`}>
              <p className="section-title">{isReady ? 'Ready to file' : 'Needs review'}</p>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                {isReady
                  ? 'All checks passed. You can continue to filing.'
                  : 'Some checks did not pass. You can still continue, but consider fixing the issues first.'}
              </p>
            </div>

            <div className="panel px-5 py-1">
              {(Object.keys(result.checks) as (keyof QualityChecks)[]).map((key) => (
                <CheckItem key={key} name={key} passed={result.checks[key]} />
              ))}
            </div>

            {result.warnings.length > 0 && (
              <div className="panel p-5">
                <p className="section-label mb-2">
                  {result.warnings.length} suggestion{result.warnings.length > 1 ? 's' : ''}
                </p>
                <ul className="space-y-2">
                  {result.warnings.map((w, i) => (
                    <li key={i} className="text-sm text-slate-600 flex gap-2">
                      <span className="text-slate-300">—</span> {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <button
              onClick={() => navigate('/ready-to-file')}
              className="btn-primary w-full mt-1"
            >
              {isReady ? 'Continue to filing' : 'Continue anyway'}
            </button>
            <button
              onClick={() => navigate('/draft')}
              className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
            >
              ← Edit request
            </button>
          </div>
        )}
       </div>
      </div>
      <AppFooter />
    </div>
  )
}
