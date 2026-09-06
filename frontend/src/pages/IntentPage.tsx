import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { ExternalLinkIcon } from 'lucide-react'
import { AppHeader } from '../components/common/AppHeader'
import { AppFooter } from '../components/common/AppFooter'
import { Spinner } from '../components/common/Spinner'
import { analyzeIntent } from '../services/api'
import { useWizard } from '../context/WizardContext'

const EXAMPLES = [
  'How much did the Ministry of Health spend on government hospitals in 2025?',
  'Provide details of tenders awarded by NHAI for highway construction in 2023–24.',
  'What is the status of my pending PF withdrawal claim filed in January 2025?',
]

const JOURNEY: [string, string, string][] = [
  ['01', 'Understand', 'Check whether RTI is the appropriate route.'],
  ['02', 'Find the authority', 'Identify the public authority that holds the records.'],
  ['03', 'Prepare the request', 'Turn your question into a clear, specific application.'],
  ['04', 'File', 'Complete the filing steps.'],
  ['05', 'Follow up', 'Track the response deadline and act if it passes.'],
]

const CAPABILITIES: [string, string][] = [
  ['Deterministic routing', 'Central vs state and suitable vs not are decided by explicit rules, not a model — and every decision is shown.'],
  ['Five request checks', 'Authority, jurisdiction, specificity, phrasing, and the character limit are checked before you file.'],
  ['Ready-to-file draft', 'A precise application, addressed to the right Public Information Officer, that you can edit line by line.'],
]

const AT_SCALE: [string, string][] = [
  ['Identity', 'Aadhaar / DigiLocker verification instead of a demo OTP.'],
  ['Filing', 'Submit through the official RTI portal API with the real ₹10 gateway; until then, export a print-ready application.'],
  ['Routing', 'A maintained registry of central ministries and every State Information Commission, kept correct as departments reorganise.'],
  ['Language', 'The rules and templates are language-agnostic — add Indian-language input and output.'],
  ['Oversight', 'Suitability, jurisdiction and checks stay deterministic and reviewable; a person confirms before anything is filed.'],
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
    if (trimmed.length < 10) {
      setError('Please describe what information you need (at least 10 characters).')
      return
    }
    mutation.mutate({ text: trimmed })
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />

      {/* ── Masthead band — pitch + form, side by side ───────────────────── */}
      <div className="bg-primary-900 text-white">
        <div className="shell-wide py-12 lg:py-16 animate-slide-up
                        grid gap-10 lg:gap-12 xl:gap-16 lg:grid-cols-[minmax(0,1fr)_minmax(0,680px)] lg:items-start">
          {/* Left — the pitch */}
          <div className="lg:pt-8">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-300">
              Right to Information Act, 2005 · Jurisdiction-aware routing
            </p>
            <h1 className="text-[30px] sm:text-[40px] xl:text-[44px] font-extrabold tracking-tight leading-[1.08] mt-3">
              File a Right to Information request in minutes — not weeks of trial and error.
            </h1>
            <p className="mt-4 text-[16px] sm:text-[17px] text-primary-100 leading-relaxed max-w-xl">
              Describe what you need in plain language. RTI Navigator decides whether an RTI fits,
              finds the Public Information Officer who holds the records, prepares the application,
              and tracks the response.
            </p>
            <p className="mt-6 text-[13px] text-primary-200">
              Reviewing the prototype?{' '}
              <Link to="/filing/dashboard" className="font-medium text-white hover:underline">
                Jump straight to filing →
              </Link>
            </p>
          </div>

          {/* Right — the request form */}
          <div className="panel p-6 sm:p-8 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_24px_56px_-24px_rgba(2,6,23,0.55)]">
            <p className="eyebrow">Start with your question</p>
            <h2 className="text-[22px] font-bold text-slate-900 mt-2">What information do you need?</h2>
            <p className="text-sm text-slate-500 mt-2 leading-relaxed">
              Be specific about the records, department, period, or subject you want to know about.
            </p>

            <textarea
              className="input-base mt-4 min-h-[150px] resize-y text-[15px] leading-relaxed"
              placeholder="For example: How much did the Ministry of Health spend on government hospitals in 2025?"
              value={text}
              onChange={(e) => { setText(e.target.value); setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit() }}
              disabled={mutation.isPending}
              maxLength={1000}
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-400">{text.length}/1000</span>
              <span className="text-xs text-slate-400">Ctrl + Enter to continue</span>
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <div className="mt-5">
              <p className="section-label mb-2">Try an example</p>
              <div className="flex flex-col divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                {EXAMPLES.map((ex) => (
                  <button
                    key={ex}
                    onClick={() => { setText(ex); setError('') }}
                    disabled={mutation.isPending}
                    className="text-left text-[13px] text-slate-600 hover:text-primary-800 hover:bg-slate-50
                               px-3.5 py-2.5 leading-snug transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
              <span className="text-[13px] text-slate-400">Saved locally in demo mode.</span>
              <button
                onClick={handleSubmit}
                disabled={mutation.isPending || !text.trim()}
                className="btn-primary flex items-center gap-2 shrink-0"
              >
                {mutation.isPending ? <><Spinner size="sm" /> Checking…</> : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Process ───────────────────────────────────────────────────────── */}
      <div className="shell pt-14">
        <h2 className="section-title">A clearer route from question to action</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
          The service guides you through each decision without requiring you to understand RTI
          procedure beforehand.
        </p>

        <ol className="mt-6 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {JOURNEY.map(([n, title, body]) => (
            <li key={n} className="panel p-4">
              <p className="text-[13px] font-bold text-primary-700 tabular-nums">{n}</p>
              <p className="text-[15px] font-semibold text-slate-900 mt-2">{title}</p>
              <p className="text-[13px] text-slate-500 mt-1 leading-relaxed">{body}</p>
            </li>
          ))}
        </ol>
      </div>

      {/* ── Why this exists ──────────────────────────────────────────────── */}
      <div className="shell pt-14">
        <h2 className="section-title">Why this exists</h2>
        <p className="text-sm text-slate-500 mt-1.5 max-w-xl leading-relaxed">
          The current process is hard to navigate. RTI Navigator makes each decision explicit.
        </p>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          <div className="panel p-6">
            <p className="text-[15px] font-semibold text-slate-900">The problem</p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              A citizen who wants a government record has to use{' '}
              <a
                href="https://rtionline.gov.in"
                target="_blank"
                rel="noreferrer"
                className="text-primary-800 font-medium inline-flex items-center gap-0.5 hover:underline"
              >
                rtionline.gov.in <ExternalLinkIcon size={12} />
              </a>
              . It is English-only, assumes you already know whether your subject is central or state,
              and offers no help choosing the correct officer among hundreds. Pick the wrong ministry
              or jurisdiction and the request is rejected or transferred — losing weeks. Most people
              give up.
            </p>
          </div>
          <div className="panel p-6">
            <p className="text-[15px] font-semibold text-slate-900">What RTI Navigator changes</p>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              The suitability and jurisdiction decisions are deterministic and auditable. Routing to a
              Public Information Officer shows its reasoning and a match-confidence figure, and
              surfaces uncertainty instead of hiding it. Drafting assists with wording and explanation;
              a person confirms before anything is filed. After filing, the response deadline is
              tracked and a First Appeal is prepared if it passes.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {CAPABILITIES.map(([title, body]) => (
            <div key={title} className="panel p-6">
              <p className="text-[15px] font-semibold text-slate-900">{title}</p>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">{body}</p>
            </div>
          ))}
        </div>

        <details className="mt-4 panel p-6 group">
          <summary className="flex items-center gap-3 cursor-pointer list-none select-none">
            <span className="text-[15px] font-semibold text-slate-900">
              How this could work at a larger scale
            </span>
            <span className="ml-auto text-xs font-medium text-slate-400 group-open:hidden">Show</span>
            <span className="ml-auto text-xs font-medium text-slate-400 hidden group-open:inline">Hide</span>
          </summary>
          <p className="text-sm text-slate-500 mt-2 leading-relaxed">
            The prototype's scope is deliberately small. A production version would add:
          </p>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {AT_SCALE.map(([term, def]) => (
              <div key={term}>
                <dt className="text-sm font-semibold text-slate-800">{term}</dt>
                <dd className="text-sm text-slate-600 mt-1 leading-relaxed">{def}</dd>
              </div>
            ))}
          </dl>
        </details>
      </div>

      {/* ── Closing strip ─────────────────────────────────────────────────── */}
      <div className="shell py-14">
        <div className="rounded-xl bg-primary-50 border border-primary-100 px-6 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="max-w-2xl">
            <p className="font-semibold text-primary-900">Designed for clarity, not complexity</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              You do not need to know the department, legal wording, or filing procedure in advance.
              Pages are lightweight, progress is saved in your browser, and you can resume any time.
            </p>
          </div>
          <Link to="/how-it-works" className="text-sm font-semibold text-primary-800 hover:underline shrink-0">
            How the process works →
          </Link>
        </div>
      </div>

      <AppFooter />
    </div>
  )
}
