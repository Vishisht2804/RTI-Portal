import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { CheckIcon, XIcon, DownloadIcon, ArrowRightIcon, ArrowLeftIcon } from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { AppFooter } from '../components/common/AppFooter'
import { Spinner } from '../components/common/Spinner'
import { useWizard } from '../context/WizardContext'
import { createRTI } from '../services/api'
import type { ReadyToFileObject } from '../types/rti'
import { CATEGORY_LABELS } from '../types/rti'

const CHECK_LABELS: Record<string, string> = {
  authority:           'Authority selected',
  jurisdiction:        'Jurisdiction determined',
  information_request: 'Request asks for information',
  specificity:         'Request is specific',
  character_limit:     'Within character limit',
}

export default function ReadyToFilePage() {
  const navigate = useNavigate()
  const { state, setRTICreate } = useWizard()
  const intent    = state.intentResult
  const authority = state.selectedAuthority
  const draft     = state.draftResult
  const validation = state.validationResult
  const editedText = state.editedDraftText ?? draft?.draft_text ?? ''
  const [apiError, setApiError] = useState('')

  useEffect(() => {
    if (!intent || !authority || !draft || !validation) navigate('/')
  }, [intent, authority, draft, validation, navigate])

  if (!intent || !authority || !draft || !validation) return null

  const isReady = validation.validation_status === 'ready'

  const payload: ReadyToFileObject = {
    draft_id:          draft.draft_id,
    authority_id:      authority.authority_id,
    authority_name:    authority.name,
    jurisdiction:      authority.jurisdiction,
    category:          intent.category,
    request_text:      editedText,
    original_query:    intent.original_query,
    validation_status: validation.validation_status,
    quality_checks:    validation.checks,
    applicant:         null,
  }

  const mutation = useMutation({
    mutationFn: () => createRTI(payload),
    onSuccess: (data) => {
      setRTICreate(data)
      setApiError('')
      navigate(`/filing/${data.rti_id}/applicant`)
    },
    onError: (err: Error) => setApiError(err.message),
  })

  const handleDownload = () => {
    const blob = new Blob([editedText], { type: 'text/plain;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `RTI-request-${authority.name.replace(/\s+/g, '-')}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps />

      <div className="page animate-slide-up">
        <Breadcrumb items={[
          { label: 'Home', to: '/' }, { label: 'Draft', to: '/draft' }, { label: 'Ready to file' },
        ]} />
        <h1 className="page-title">{isReady ? 'Ready to file.' : 'A few things to review.'}</h1>
        <p className="text-sm text-slate-500 mt-3 flex flex-wrap gap-x-2 gap-y-1">
          {['1 Applicant', '2 Documents', '3 Payment', '4 Review', '5 Submit'].map((s, i) => (
            <span key={s} className="flex items-center gap-2">
              {i > 0 && <span className="text-slate-300">·</span>}{s}
            </span>
          ))}
        </p>
        <p className="page-subtitle measure mb-8">
          Check the details below, then continue to filing to add your applicant information.
        </p>

        <div className="wizard-grid lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main — request summary */}
          <div>
            <div className="panel divide-y divide-slate-200">
              <div className="p-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="section-label">Authority</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{authority.name}</p>
                </div>
                <div>
                  <p className="section-label">Jurisdiction</p>
                  <p className="text-sm font-medium text-slate-800 mt-1 capitalize">{authority.jurisdiction} government</p>
                </div>
                <div>
                  <p className="section-label">Subject</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{CATEGORY_LABELS[intent.category]}</p>
                </div>
              </div>
              <div className="p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="section-label">Request text</p>
                  <span className="text-xs text-slate-400">{editedText.length.toLocaleString()} characters</span>
                </div>
                <pre className="text-[15px] text-slate-700 leading-7 whitespace-pre-wrap font-sans max-h-[420px]
                                overflow-y-auto bg-slate-50 rounded-lg p-4 border border-slate-100">
                  {editedText}
                </pre>
              </div>
            </div>

            {apiError && (
              <div className="panel p-5 mt-4 border-l-2 border-l-red-500">
                <p className="section-title">Could not continue</p>
                <p className="text-sm text-slate-600 mt-1">{apiError}</p>
                <p className="text-xs text-slate-400 mt-2">Download your request to keep a copy.</p>
              </div>
            )}

            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="btn-primary w-full mt-6"
            >
              {mutation.isPending ? <span className="inline-flex items-center gap-2"><Spinner size="sm" /> Preparing…</span> : 'Continue to filing'}
            </button>
            <div className="flex items-center justify-center gap-5 mt-3">
              <button onClick={() => navigate('/quality-check')} className="text-sm font-medium text-slate-500 hover:text-slate-800">
                ← Back
              </button>
              <button onClick={handleDownload} className="text-sm font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1.5">
                <DownloadIcon size={14} /> Download
              </button>
            </div>
            <p className="text-[13px] text-slate-400 mt-4 text-center">
              Demo mode: OTP, payment, and submission are simulated for this prototype.
            </p>
          </div>

          {/* Aside — readiness checklist */}
          <aside className="lg:sticky lg:top-24">
            <div className="panel p-5">
              <p className="section-label mb-2">Readiness</p>
              <div>
                {(Object.entries(validation.checks) as [string, boolean][]).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-3 py-2 border-b border-slate-100 last:border-0">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0
                        ${v ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}
                    >
                      {v ? <CheckIcon size={13} /> : <XIcon size={13} />}
                    </span>
                    <span className="text-sm text-slate-700">{CHECK_LABELS[k] ?? k.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
