import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  SearchIcon, ArrowRightIcon, SparklesIcon, ShieldCheckIcon, ZapIcon,
  InfoIcon, ExternalLinkIcon, ScaleIcon, WifiIcon,
} from 'lucide-react'
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

        {/* Why this exists — problem framing */}
        <div className="card shadow-xl mb-4 border-l-4 border-primary-500">
          <div className="flex items-center gap-2 mb-2">
            <InfoIcon size={15} className="text-primary-600" />
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Why this exists</p>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            An ordinary citizen who wants a government record has to use{' '}
            <a
              href="https://rtionline.gov.in"
              target="_blank"
              rel="noreferrer"
              className="text-primary-700 font-medium inline-flex items-center gap-0.5 hover:underline"
            >
              rtionline.gov.in <ExternalLinkIcon size={12} />
            </a>
            . That portal is English-only, assumes you already know whether your subject is
            <em> central</em> or <em> state</em>, and gives no help choosing the correct Public
            Information Officer among hundreds. Pick the wrong ministry or jurisdiction and the
            application is rejected or transferred, losing weeks. Most people give up.
          </p>
          <p className="text-sm text-slate-600 leading-relaxed mt-2">
            <span className="font-semibold text-slate-700">What we changed:</span> you describe
            the information you want in plain language. RTI Navigator classifies suitability and
            jurisdiction with deterministic rules, recommends the right authority, drafts a
            legally-phrased application, and runs quality checks — before you file.
          </p>
        </div>

        {/* Reviewer / demo credentials */}
        <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2.5 mb-4 text-xs text-amber-800 flex flex-wrap items-center gap-x-4 gap-y-1">
          <span className="font-bold uppercase tracking-wide">Demo</span>
          <span>Mock consumer login — OTP <span className="font-mono font-semibold">123456</span></span>
          <span>Payment ₹10 auto-approves (or simulate failure)</span>
          <span>Every step is labelled <span className="font-semibold">SIMULATED</span>; nothing is filed</span>
        </div>

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

        {/* How this could scale */}
        <details className="card mt-6 group">
          <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
            <ScaleIcon size={15} className="text-primary-600" />
            <span className="text-sm font-semibold text-slate-700">How this could work safely at a larger scale</span>
            <span className="ml-auto text-xs text-slate-400 group-open:hidden">Show</span>
            <span className="ml-auto text-xs text-slate-400 hidden group-open:inline">Hide</span>
          </summary>
          <ul className="mt-3 space-y-2 text-sm text-slate-600 leading-relaxed">
            <li><span className="font-medium text-slate-700">Identity:</span> Aadhaar / DigiLocker-based auth instead of a demo OTP, so an applicant's identity is verified once and reused.</li>
            <li><span className="font-medium text-slate-700">Filing:</span> submit through the official RTI portal API if/when it is opened, with the simulated payment replaced by the real ₹10 gateway; until then, export a print-ready application.</li>
            <li><span className="font-medium text-slate-700">Routing:</span> a maintained registry of central ministries and every State Information Commission, so jurisdiction and PIO routing stay correct as departments reorganise.</li>
            <li><span className="font-medium text-slate-700">Language:</span> the deterministic rules and drafting templates are language-agnostic; add Indian-language input and output.</li>
            <li><span className="font-medium text-slate-700">Safety:</span> AI only drafts and explains — suitability, jurisdiction and quality checks stay deterministic and auditable, with a human confirming before anything is filed.</li>
          </ul>
        </details>

        {/* Slow-connection note */}
        <p className="mt-4 text-xs text-slate-400 flex items-center gap-1.5">
          <WifiIcon size={12} />
          Built light for slower connections — pages are small, your progress is saved in the
          browser, and you can close the tab and resume later.
        </p>
      </div>
    </div>
  )
}
