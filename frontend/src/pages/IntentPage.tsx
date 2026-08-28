import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { SearchIcon, ArrowRightIcon, SparklesIcon, ShieldCheckIcon, ZapIcon } from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Spinner } from '../components/common/Spinner'
import { ErrorMessage } from '../components/common/ErrorMessage'
import { analyzeIntent } from '../services/api'
import { useWizard } from '../context/WizardContext'

const EXAMPLES = [
  'How much did the Ministry of Health spend on government hospitals in 2025?',
  'What is the total budget allocated to mid-day meal scheme in Karnataka for FY 2024-25?',
  'Provide details of tenders awarded by NHAI for highway construction in 2023–24.',
  'What is the status of my pending PF withdrawal claim filed in January 2025?',
  'List of AIIMS hospitals sanctioned under Pradhan Mantri Swasthya Suraksha Yojana.',
]

export default function IntentPage() {
  const navigate  = useNavigate()
  const { state, setQuery, setIntent } = useWizard()
  const [text, setText]   = useState(state.originalQuery)
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: analyzeIntent,
    onSuccess: (data) => {
      setQuery(text.trim())
      setIntent(data)
      navigate('/suitability')
    },
    onError: (err: Error) => setError(err.message),
  })

  const handleSubmit = () => {
    setError('')
    const trimmed = text.trim()
    if (!trimmed || trimmed.length < 10) {
      setError('Please describe what information you need (at least 10 characters).')
      return
    }
    mutation.mutate({ text: trimmed })
  }

  const handleExample = (ex: string) => {
    setText(ex)
    setError('')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <ProgressSteps currentStep={1} />

      {/* Hero */}
      <div className="hero-gradient text-white">
        <div className="max-w-3xl mx-auto px-4 pt-12 pb-16 text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-1.5 text-sm font-medium mb-6">
            <SparklesIcon size={14} className="text-saffron-400" />
            AI-powered · RTI Act 2005 · 35+ Authorities
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight mb-4">
            File your RTI in{' '}
            <span className="text-saffron-400">minutes,</span>
            <br />not hours
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed max-w-xl mx-auto">
            Tell us what information you need from the government. Our AI will draft a legally
            correct RTI application — jurisdiction-aware and ready to file.
          </p>
        </div>
      </div>

      {/* Input card — overlaps hero */}
      <div className="max-w-3xl w-full mx-auto px-4 -mt-8 pb-16">
        <div className="card shadow-xl">
          <label className="block text-sm font-semibold text-slate-600 mb-2">
            What government information do you need?
          </label>
          <div className="relative">
            <SearchIcon className="absolute left-4 top-4 text-slate-400" size={18} />
            <textarea
              className="input-base pl-11 min-h-[120px] resize-none text-base leading-relaxed"
              placeholder="e.g. How much did the Ministry of Health spend on hospitals in 2025?"
              value={text}
              onChange={(e) => { setText(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit() }}
              disabled={mutation.isPending}
              maxLength={1000}
            />
          </div>

          {/* Char count */}
          <div className="flex justify-between items-center mt-1 mb-4">
            <span className="text-xs text-slate-400">{text.length}/1000</span>
            <span className="text-xs text-slate-400">Ctrl+Enter to submit</span>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 rounded-xl px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || !text.trim()}
            className="btn-primary w-full flex items-center justify-center gap-2 text-base"
          >
            {mutation.isPending ? (
              <><Spinner size="sm" /> Analysing your query…</>
            ) : (
              <> Analyse My Query <ArrowRightIcon size={18} /></>
            )}
          </button>

          {/* Examples */}
          <div className="mt-6">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Try an example
            </p>
            <div className="flex flex-col gap-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => handleExample(ex)}
                  disabled={mutation.isPending}
                  className="text-left text-sm text-primary-700 hover:text-primary-900 hover:bg-primary-50
                             px-3 py-2 rounded-lg transition-colors duration-150 border border-transparent
                             hover:border-primary-100"
                >
                  "{ex}"
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Feature pills */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          {[
            { icon: <ZapIcon size={16} />,         label: 'GPT-4o powered draft' },
            { icon: <ShieldCheckIcon size={16} />, label: 'Deterministic jurisdiction' },
            { icon: <SparklesIcon size={16} />,    label: '35 curated authorities' },
          ].map(({ icon, label }) => (
            <div key={label}
              className="flex items-center gap-2 bg-white rounded-xl px-3 py-2.5 shadow-sm border border-slate-100 text-xs text-slate-600 font-medium"
            >
              <span className="text-primary-600">{icon}</span> {label}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
