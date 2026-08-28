import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CheckCircle2Icon, XCircleIcon, AlertTriangleIcon,
  ArrowRightIcon, ArrowLeftIcon, LightbulbIcon, MapPinIcon,
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { useWizard } from '../context/WizardContext'
import { CATEGORY_LABELS } from '../types/rti'

export default function SuitabilityPage() {
  const navigate = useNavigate()
  const { state } = useWizard()
  const result = state.intentResult

  useEffect(() => { if (!result) navigate('/') }, [result, navigate])
  if (!result) return null

  const { is_rti_suitable, jurisdiction, category, suitability_explanation, reformulation_suggestion } = result

  const isState   = jurisdiction === 'state'
  const isSuitable = is_rti_suitable && !isState

  const statusConfig = isSuitable
    ? { icon: <CheckCircle2Icon size={40} />, color: 'emerald', label: 'RTI Suitable', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
    : isState
    ? { icon: <AlertTriangleIcon size={40} />, color: 'orange', label: 'State Government Matter', bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' }
    : { icon: <XCircleIcon size={40} />, color: 'red', label: 'Not RTI Suitable', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps currentStep={2} />

      <div className="max-w-4xl w-full mx-auto px-6 lg:px-8 py-10 flex flex-col gap-6 animate-slide-up">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Suitability Check</h2>
          <p className="text-slate-500 text-sm mt-1">
            We've analysed your query against RTI Act 2005 criteria.
          </p>
        </div>

        {/* Query echo */}
        <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Your query</p>
          <p className="text-slate-700 text-sm leading-relaxed">"{result.original_query}"</p>
        </div>

        {/* Verdict card */}
        <div className={`rounded-2xl border-2 ${statusConfig.bg} ${statusConfig.border} p-6`}>
          <div className="flex items-start gap-4">
            <div className={`${statusConfig.text} mt-0.5 shrink-0`}>{statusConfig.icon}</div>
            <div>
              <div className={`font-bold text-xl ${statusConfig.text}`}>{statusConfig.label}</div>
              <p className="text-slate-600 text-sm mt-2 leading-relaxed">{suitability_explanation}</p>
            </div>
          </div>
        </div>

        {/* Category + Jurisdiction */}
        <div className="grid grid-cols-2 gap-4">
          <div className="card">
            <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Category</p>
            <p className="font-semibold text-slate-700">{CATEGORY_LABELS[category]}</p>
          </div>
          <div className="card flex items-start gap-2">
            <MapPinIcon size={16} className={isState ? 'text-orange-500 mt-0.5' : 'text-primary-600 mt-0.5'} />
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider mb-1">Jurisdiction</p>
              <p className={`font-semibold ${isState ? 'text-orange-600' : 'text-primary-700'}`}>
                {jurisdiction === 'central' ? 'Central Government' : 'State Government'}
              </p>
            </div>
          </div>
        </div>

        {/* State RTI guidance */}
        {isState && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <div className="flex gap-3">
              <LightbulbIcon className="text-orange-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-orange-800 text-sm">How to file a State RTI</p>
                <p className="text-orange-700 text-sm mt-1 leading-relaxed">
                  State government RTIs must be filed with your state's RTI portal or physically
                  to the State Public Information Officer (SPIO). We'll still draft the application
                  for you — you can download and submit it through your state's channel.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Reformulation suggestion */}
        {!is_rti_suitable && reformulation_suggestion && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex gap-3">
              <LightbulbIcon className="text-blue-500 shrink-0 mt-0.5" size={18} />
              <div>
                <p className="font-semibold text-blue-800 text-sm">Suggestion</p>
                <p className="text-blue-700 text-sm mt-1 leading-relaxed">{reformulation_suggestion}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
          <button onClick={() => navigate('/')} className="btn-secondary flex items-center gap-2">
            <ArrowLeftIcon size={16} /> Back
          </button>
          <button
            onClick={() => navigate('/authority')}
            className="btn-primary flex-1 flex items-center justify-center gap-2"
          >
            {isSuitable ? 'Continue to Authority' : 'Draft Anyway'}
            <ArrowRightIcon size={16} />
          </button>
        </div>

        {result.used_fallback && (
          <p className="text-xs text-center text-slate-400">
            ⚡ Using cached analysis (AI unavailable)
          </p>
        )}
      </div>
    </div>
  )
}
