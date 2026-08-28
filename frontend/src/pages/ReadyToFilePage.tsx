import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  FileTextIcon, CheckCircle2Icon, SendIcon, DownloadIcon,
  BuildingIcon, MapPinIcon, TagIcon, ShieldCheckIcon,
  AlertTriangleIcon,
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Spinner } from '../components/common/Spinner'
import { useWizard } from '../context/WizardContext'
import { createRTI } from '../services/api'
import type { ReadyToFileObject } from '../types/rti'
import { CATEGORY_LABELS } from '../types/rti'

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
    draft_id:         draft.draft_id,
    authority_id:     authority.authority_id,
    authority_name:   authority.name,
    jurisdiction:     authority.jurisdiction,
    category:         intent.category,
    request_text:     editedText,
    original_query:   intent.original_query,
    validation_status: validation.validation_status,
    quality_checks:   validation.checks,
    applicant:        null,
  }

  const mutation = useMutation({
    mutationFn: () => createRTI(payload),
    onSuccess: (data) => {
      setRTICreate(data)
      setApiError('')
      navigate(`/filing/${data.rti_id}/applicant`)
    },
    onError: (err: Error) => {
      // P2 endpoint may not be live yet — show the payload so demo still works
      setApiError(err.message)
    },
  })

  const handleDownload = () => {
    const blob = new Blob([editedText], { type: 'text/plain' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `RTI_${authority.name.replace(/\s+/g, '_')}_${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps currentStep={6} />

      <div className="max-w-4xl w-full mx-auto px-6 lg:px-8 py-10 animate-slide-up">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Ready to File</h2>
        <p className="text-slate-500 text-sm mb-6">Review your complete RTI application before submission.</p>

        {/* Quality badge */}
        <div className={`rounded-xl border-2 p-4 flex items-center gap-3 mb-6
          ${isReady ? 'bg-emerald-50 border-emerald-200' : 'bg-orange-50 border-orange-200'}`}>
          {isReady
            ? <ShieldCheckIcon className="text-emerald-600 shrink-0" size={24} />
            : <AlertTriangleIcon className="text-orange-500 shrink-0" size={24} />
          }
          <div>
            <p className={`font-bold text-sm ${isReady ? 'text-emerald-800' : 'text-orange-700'}`}>
              Quality: {validation.validation_status === 'ready' ? 'Ready to File' : 'Needs Review'}
            </p>
            <p className="text-xs text-slate-500">
              {Object.values(validation.checks).filter(Boolean).length}/5 checks passed
            </p>
          </div>
        </div>

        {/* Summary details */}
        <div className="card mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-start gap-2">
              <BuildingIcon size={16} className="text-primary-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Authority</p>
                <p className="text-sm font-semibold text-slate-700">{authority.name}</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPinIcon size={16} className="text-primary-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Jurisdiction</p>
                <p className="text-sm font-semibold text-slate-700 capitalize">{authority.jurisdiction} Govt.</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <TagIcon size={16} className="text-primary-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Category</p>
                <p className="text-sm font-semibold text-slate-700">{CATEGORY_LABELS[intent.category]}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Draft preview */}
        <div className="card mb-6">
          <div className="flex items-center gap-2 mb-3">
            <FileTextIcon size={16} className="text-slate-500" />
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Draft text</p>
            <span className="ml-auto text-xs text-slate-400 font-mono">{editedText.length.toLocaleString()} chars</span>
          </div>
          <pre className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap font-sans max-h-64 overflow-y-auto bg-slate-50 rounded-lg p-3">
            {editedText}
          </pre>
        </div>

        {/* Quality checks mini */}
        <div className="card mb-6">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Quality checks</p>
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(validation.checks) as [string, boolean][]).map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                {v
                  ? <CheckCircle2Icon size={14} className="text-emerald-500 shrink-0" />
                  : <AlertTriangleIcon size={14} className="text-orange-400 shrink-0" />
                }
                <span className="text-xs text-slate-600 capitalize">{k.replace(/_/g, ' ')}</span>
              </div>
            ))}
          </div>
        </div>

        {apiError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-sm text-red-700">
            <p className="font-semibold mb-1">Filing error</p>
            <p>{apiError}</p>
            <p className="text-xs mt-2 text-red-500">
              (P2 endpoint may not be live yet. Download your draft to file manually.)
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/quality-check')}
            className="btn-secondary flex items-center gap-2">
            Back
          </button>
          <button onClick={handleDownload}
            className="btn-secondary flex items-center gap-2">
            <DownloadIcon size={16} /> Download
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {mutation.isPending
              ? <><Spinner size="sm" /> Filing…</>
              : <><SendIcon size={16} /> Submit RTI</>
            }
          </button>
        </div>
      </div>
    </div>
  )
}
