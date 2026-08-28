import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import {
  SearchIcon, ArrowRightIcon, ShieldCheckIcon, ScaleIcon, WifiIcon,
  ExternalLinkIcon, FileTextIcon,
} from 'lucide-react'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Spinner } from '../components/common/Spinner'
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
  const navigate = useNavigate()
  const { state, setQuery, setIntent } = useWizard()
  const [text, setText] = useState(state.originalQuery)
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

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps currentStep={1} />

      {/* Reviewer / demo strip — full width */}
      <div className="w-full border-b border-amber-200 bg-amber-50">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-2 text-xs text-amber-800 flex flex-wrap items-center gap-x-5 gap-y-1">
          <span className="font-bold uppercase tracking-wide">Demo</span>
          <span>Mock login OTP <span className="font-mono font-semibold">123456</span></span>
          <span>₹10 payment auto-approves</span>
          <span>Every action is labelled <span className="font-semibold">SIMULATED</span> — nothing is filed</span>
        </div>
      </div>

      <div className="flex-1 w-full">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-10 lg:py-14 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(420px,540px)] gap-10 lg:gap-16 items-start">

          {/* Left — the pitch */}
          <div>
            <p className="text-xs font-semibold text-primary-700 uppercase tracking-[0.2em] mb-3">
              RTI Act 2005 · 35+ authorities · jurisdiction-aware
            </p>
            <h1 className="text-3xl lg:text-[2.75rem] leading-[1.1] font-bold text-slate-900 tracking-tight">
              File a Right to Information request in minutes — not weeks of trial and error.
            </h1>
            <p className="mt-4 text-lg text-slate-600 leading-relaxed max-w-2xl">
              Describe what you need from the government in plain language. RTI Navigator
              determines suitability and jurisdiction, finds the right Public Information
              Officer, drafts the application, and checks it — before you file.
            </p>

            <div className="mt-8 border-t border-slate-200 pt-6 max-w-2xl">
              <h2 className="text-sm font-semibold text-slate-800 mb-2">Why this exists</h2>
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
                . It is English-only, assumes you already know whether your subject is{' '}
                <em>central</em> or <em>state</em>, and offers no help choosing the correct
                officer among hundreds. Pick the wrong ministry or jurisdiction and the
                request is rejected or transferred — losing weeks. Most people give up.
              </p>
              <p className="text-sm text-slate-600 leading-relaxed mt-2">
                <span className="font-semibold text-slate-800">What we changed:</span> the
                jurisdiction and suitability decisions are deterministic and auditable; the AI
                only drafts and explains; a person confirms before anything is filed.
              </p>
            </div>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
              {[
                { icon: <ScaleIcon size={15} />, title: 'Deterministic rules', body: 'Central vs state, suitable vs not — not left to a model.' },
                { icon: <ShieldCheckIcon size={15} />, title: '5 quality checks', body: 'Authority, specificity, character limit, phrasing.' },
                { icon: <FileTextIcon size={15} />, title: 'Ready-to-file draft', body: 'Legally phrased, addressed to the right PIO.' },
              ].map((f) => (
                <div key={f.title} className="rounded-lg border border-slate-200 bg-white p-3">
                  <div className="flex items-center gap-1.5 text-primary-700 font-semibold text-sm">
                    {f.icon} {f.title}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">{f.body}</p>
                </div>
              ))}
            </div>

            <details className="mt-6 rounded-lg border border-slate-200 bg-white p-4 max-w-2xl group">
              <summary className="flex items-center gap-2 cursor-pointer list-none select-none">
                <ScaleIcon size={15} className="text-primary-600" />
                <span className="text-sm font-semibold text-slate-800">
                  How this could work safely at a larger scale
                </span>
                <span className="ml-auto text-xs text-slate-400 group-open:hidden">Show</span>
                <span className="ml-auto text-xs text-slate-400 hidden group-open:inline">Hide</span>
              </summary>
              <ul className="mt-3 space-y-2 text-sm text-slate-600 leading-relaxed">
                <li><span className="font-medium text-slate-800">Identity:</span> Aadhaar / DigiLocker auth instead of a demo OTP.</li>
                <li><span className="font-medium text-slate-800">Filing:</span> submit via the official RTI portal API if it opens, with the real ₹10 gateway; until then, export a print-ready application.</li>
                <li><span className="font-medium text-slate-800">Routing:</span> a maintained registry of central ministries and every State Information Commission, kept correct as departments reorganise.</li>
                <li><span className="font-medium text-slate-800">Language:</span> the rules and templates are language-agnostic — add Indian-language input and output.</li>
                <li><span className="font-medium text-slate-800">Safety:</span> AI drafts and explains only; suitability, jurisdiction and checks stay deterministic and reviewable.</li>
              </ul>
            </details>

            <p className="mt-5 text-xs text-slate-400 flex items-center gap-1.5">
              <WifiIcon size={12} />
              Built light for slower connections — small pages, progress saved in the browser, resume any time.
            </p>
          </div>

          {/* Right — the form */}
          <div className="lg:sticky lg:top-28">
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                What government information do you need?
              </label>
              <div className="relative">
                <SearchIcon className="absolute left-3.5 top-3.5 text-slate-400" size={18} />
                <textarea
                  className="input-base pl-10 min-h-[140px] resize-none text-base leading-relaxed"
                  placeholder="e.g. How much did the Ministry of Health spend on hospitals in 2025?"
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError('') }}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleSubmit() }}
                  disabled={mutation.isPending}
                  maxLength={1000}
                />
              </div>

              <div className="flex justify-between items-center mt-1 mb-4">
                <span className="text-xs text-slate-400">{text.length}/1000</span>
                <span className="text-xs text-slate-400">Ctrl + Enter to submit</span>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4">
                  {error}
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={mutation.isPending || !text.trim()}
                className="btn-primary w-full flex items-center justify-center gap-2 text-base"
              >
                {mutation.isPending
                  ? <><Spinner size="sm" /> Analysing your query…</>
                  : <>Analyse my query <ArrowRightIcon size={18} /></>}
              </button>

              <div className="mt-6">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Try an example
                </p>
                <div className="flex flex-col">
                  {EXAMPLES.map((ex) => (
                    <button
                      key={ex}
                      onClick={() => { setText(ex); setError('') }}
                      disabled={mutation.isPending}
                      className="text-left text-sm text-slate-600 hover:text-primary-800 hover:bg-primary-50
                                 px-3 py-2 rounded-md transition-colors duration-150 border-l-2 border-transparent
                                 hover:border-primary-400"
                    >
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <p className="mt-3 text-center text-xs text-slate-500">
              Just reviewing?{' '}
              <Link
                to="/filing/1/applicant"
                className="font-semibold text-primary-700 hover:underline inline-flex items-center gap-1"
              >
                <FileTextIcon size={12} /> Skip the intake and jump straight to filing
              </Link>
            </p>
          </div>

        </div>
      </div>
    </div>
  )
}
