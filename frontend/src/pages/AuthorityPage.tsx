import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  BuildingIcon, ArrowRightIcon, ArrowLeftIcon,
  CheckCircle2Icon, ShieldIcon, ChevronDownIcon, ChevronUpIcon
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { useWizard } from '../context/WizardContext'
import { recommendAuthority } from '../services/api'
import type { AuthorityResult } from '../types/rti'

const CONFIDENCE_STYLES: Record<string, string> = {
  high:   'badge-green',
  medium: 'badge-orange',
  low:    'badge-slate',
}

function AuthorityCard({
  authority, selected, onSelect,
}: { authority: AuthorityResult; selected: boolean; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className={`w-full text-left rounded-2xl border-2 p-5 transition-all duration-200
        ${selected
          ? 'border-primary-600 bg-primary-50 shadow-md'
          : 'border-slate-200 bg-white hover:border-primary-200 hover:bg-slate-50'
        }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0
            ${selected ? 'bg-primary-700' : 'bg-slate-100'}`}>
            <BuildingIcon size={20} className={selected ? 'text-white' : 'text-slate-500'} />
          </div>
          <div>
            <p className={`font-bold text-base ${selected ? 'text-primary-800' : 'text-slate-800'}`}>
              {authority.name}
            </p>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className={CONFIDENCE_STYLES[authority.confidence]}>
                {authority.confidence} match
              </span>
              <span className="badge-blue capitalize">{authority.jurisdiction}</span>
            </div>
            {authority.description && (
              <p className="text-sm text-slate-500 mt-2 leading-relaxed">{authority.description}</p>
            )}
            <p className="text-xs text-slate-400 mt-1.5 italic">{authority.reason}</p>
          </div>
        </div>
        {selected && <CheckCircle2Icon className="text-primary-600 shrink-0 mt-1" size={20} />}
      </div>
    </button>
  )
}

export default function AuthorityPage() {
  const navigate = useNavigate()
  const { state, setAuthority } = useWizard()
  const intent = state.intentResult
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(
    state.selectedAuthority?.authority_id ?? null
  )
  const [apiError, setApiError] = useState('')

  useEffect(() => { if (!intent) navigate('/') }, [intent, navigate])

  const mutation = useMutation({
    mutationFn: recommendAuthority,
    onSuccess: (data) => {
      if (!selectedId) setSelectedId(data.primary.authority_id)
      setAuthority(data, data.primary)
    },
    onError: (err: Error) => setApiError(err.message),
  })

  // Auto-fetch on mount if we don't already have a result
  useEffect(() => {
    if (!intent) return
    if (!state.authorityResult) {
      mutation.mutate({
        category:      intent.category,
        entities:      intent.entities,
        jurisdiction:  intent.jurisdiction,
        original_query: intent.original_query,
      })
    }
  }, [])  // eslint-disable-line

  const authorityData  = state.authorityResult
  const allAuthorities = authorityData
    ? [authorityData.primary, ...authorityData.alternatives]
    : []

  const handleSelect = (auth: AuthorityResult) => {
    setSelectedId(auth.authority_id)
    if (authorityData) setAuthority(authorityData, auth)
  }

  const handleContinue = () => {
    const selected = allAuthorities.find((a) => a.authority_id === selectedId)
    if (!selected || !authorityData) return
    setAuthority(authorityData, selected)
    navigate('/draft')
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps currentStep={3} />

      <div className="max-w-2xl w-full mx-auto px-4 py-10 animate-slide-up">
        <h2 className="text-2xl font-bold text-slate-800 mb-1">Authority Finder</h2>
        <p className="text-slate-500 text-sm mb-6">
          We matched your query to the most relevant Public Information Officer.
        </p>

        {mutation.isPending && (
          <div className="card flex justify-center py-12">
            <Spinner size="lg" label="Finding the right authority…" />
          </div>
        )}

        {apiError && <ErrorMessage message={apiError} onRetry={() => mutation.mutate({
          category: intent!.category, entities: intent!.entities,
          jurisdiction: intent!.jurisdiction, original_query: intent!.original_query,
        })} />}

        {authorityData && !mutation.isPending && (
          <div className="flex flex-col gap-4">
            {/* Recommended */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldIcon size={14} className="text-primary-600" />
                <span className="text-xs font-semibold text-primary-700 uppercase tracking-wider">
                  Recommended Authority
                </span>
              </div>
              <AuthorityCard
                authority={authorityData.primary}
                selected={selectedId === authorityData.primary.authority_id}
                onSelect={() => handleSelect(authorityData.primary)}
              />
            </div>

            {/* Alternatives */}
            {authorityData.alternatives.length > 0 && (
              <div>
                <button
                  className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 font-medium mb-2 transition-colors"
                  onClick={() => setShowAlternatives((v) => !v)}
                >
                  {showAlternatives ? <ChevronUpIcon size={14} /> : <ChevronDownIcon size={14} />}
                  {showAlternatives ? 'Hide' : 'Show'} {authorityData.alternatives.length} alternatives
                </button>
                {showAlternatives && authorityData.alternatives.map((alt) => (
                  <div key={alt.authority_id} className="mb-3">
                    <AuthorityCard
                      authority={alt}
                      selected={selectedId === alt.authority_id}
                      onSelect={() => handleSelect(alt)}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* CTA */}
            <div className="flex gap-3 mt-2">
              <button onClick={() => navigate('/suitability')} className="btn-secondary flex items-center gap-2">
                <ArrowLeftIcon size={16} /> Back
              </button>
              <button
                onClick={handleContinue}
                disabled={!selectedId}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
              >
                Generate Draft <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
