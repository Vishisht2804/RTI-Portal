import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ProgressSteps } from '../components/common/ProgressSteps'
import { Breadcrumb } from '../components/common/Breadcrumb'
import { AppFooter } from '../components/common/AppFooter'
import { useWizard } from '../context/WizardContext'
import { CATEGORY_LABELS } from '../types/rti'

export default function SuitabilityPage() {
  const navigate = useNavigate()
  const { state } = useWizard()
  const result = state.intentResult
  // branch: null = grievance screen | 'reframe' = reframing interstitial | 'rti' = RTI flow
  const [branch, setBranch] = useState<null | 'reframe' | 'rti'>(null)

  useEffect(() => { if (!result) navigate('/') }, [result, navigate])
  if (!result) return null

  const {
    is_rti_suitable, jurisdiction, category,
    suitability_explanation, reformulation_suggestion, grievance,
  } = result
  const isState = jurisdiction === 'state'

  // ── Grievance screen ─────────────────────────────────────────────────────
  if (grievance?.detected && branch === null) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <ProgressSteps />
        <div className="page animate-slide-up">
          <Breadcrumb items={[
            { label: 'Home', to: '/' }, { label: 'Start a request', to: '/' },
            { label: 'Suitability' }, { label: 'Grievance' },
          ]} />
          <h1 className="page-title">This looks like a grievance, not an RTI.</h1>
          <p className="page-subtitle max-w-2xl">
            Your goal appears to be getting a problem fixed rather than obtaining existing government
            records.
          </p>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
            <div>
              <div className="panel p-6">
                <p className="eyebrow">Grievance route</p>
                <h2 className="section-title mt-2">Get the problem fixed</h2>
                <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">
                  {grievance.fix_route_explanation}
                </p>
                <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">{grievance.rti_reframe}</p>
                <p className="text-[13px] text-slate-400 mt-4">
                  RTI Navigator provides guidance only. It does not file grievances on your behalf.
                </p>
              </div>
              <button onClick={() => navigate('/')} className="text-sm font-medium text-slate-500 hover:text-slate-800 mt-4">
                ← Back and change my request
              </button>
            </div>

            <aside>
              <div className="panel p-6">
                <h3 className="section-title">Suggested route</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Use the appropriate public grievance channel for the department concerned. The Centre
                  runs CPGRAMS (pgportal.gov.in) and most states run their own portals.
                </p>
              </div>
              {/* Primary: real external link to CPGRAMS */}
              <a
                href="https://pgportal.gov.in/"
                target="_blank"
                rel="noreferrer"
                className="btn-primary w-full mt-4 block text-center"
              >
                Get the problem fixed →
              </a>
              {/* Secondary: reframe as information request — does NOT go directly to authority */}
              <button
                onClick={() => setBranch('reframe')}
                className="block w-full text-center text-sm font-medium text-primary-800 hover:underline mt-3"
              >
                Ask for information instead
              </button>
            </aside>
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  // ── Reframing interstitial ────────────────────────────────────────────────
  if (grievance?.detected && branch === 'reframe') {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <ProgressSteps />
        <div className="page animate-slide-up">
          <Breadcrumb items={[
            { label: 'Home', to: '/' }, { label: 'Start a request', to: '/' },
            { label: 'Suitability' }, { label: 'Reframe as RTI' },
          ]} />
          <h1 className="page-title">Reframing as an information request</h1>
          <p className="page-subtitle max-w-2xl">
            RTI is not a tool to compel action — but it can reveal what the authority has recorded,
            approved, spent, or done about a problem.
          </p>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
            <div className="space-y-4">
              <div className="panel p-6">
                <p className="eyebrow">What you can ask via RTI</p>
                <h2 className="section-title mt-2">Ask for records, not action</h2>
                <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">
                  If your goal is to know what the government has recorded, approved, spent, or done about
                  this problem, you can continue as an RTI. The application will ask the authority for
                  records — it cannot demand that they fix anything.
                </p>
              </div>

              {reformulation_suggestion && (
                <div className="panel p-6">
                  <p className="section-title">Suggested wording for an RTI</p>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{reformulation_suggestion}</p>
                </div>
              )}
            </div>

            <aside>
              <div className="panel p-6">
                <h3 className="section-title">Important distinction</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  An RTI reply puts the authority's records on the public record — this often prompts
                  action — but the RTI Act itself only gives you access to information.
                </p>
              </div>
              <button
                onClick={() => setBranch('rti')}
                className="btn-primary w-full mt-4"
              >
                Continue as RTI
              </button>
              <button
                onClick={() => setBranch(null)}
                className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
              >
                ← Back
              </button>
            </aside>
          </div>
        </div>
        <AppFooter />
      </div>
    )
  }

  // ── Suitability verdict (branch === 'rti' means user explicitly reframed) ──
  const cameFromGrievance = grievance?.detected && branch === 'rti'
  const isSuitable = (is_rti_suitable || cameFromGrievance) && !isState

  const verdict = isSuitable
    ? { eyebrow: 'RTI suitability', title: 'Yes — this can be answered through RTI.' }
    : isState
    ? { eyebrow: 'State jurisdiction', title: 'This concerns a state government authority.' }
    : { eyebrow: 'RTI suitability', title: 'This may not be answerable through RTI.' }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <ProgressSteps />
      <div className="page animate-slide-up">
        <Breadcrumb items={[
          { label: 'Home', to: '/' }, { label: 'Start a request', to: '/' }, { label: 'Suitability' },
        ]} />
        <h1 className="page-title">Is an RTI the right route?</h1>
        <p className="page-subtitle max-w-3xl">You asked: {result.original_query}</p>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_340px] items-start mt-8">
          <div>
            <div className="panel p-6">
              <p className="eyebrow">{verdict.eyebrow}</p>
              <h2 className="text-xl font-bold text-slate-900 mt-2">{verdict.title}</h2>
              <p className="text-[15px] text-slate-600 mt-3 leading-relaxed">
                {cameFromGrievance
                  ? 'You chose to ask for records on this issue. The request will be prepared as an RTI for what the authority has recorded and done.'
                  : suitability_explanation}
              </p>
              {isSuitable && (
                <p className="text-sm font-semibold text-primary-800 mt-5">
                  Next: identify the authority that holds these records →
                </p>
              )}
            </div>

            {isState && (
              <div className="panel p-6 mt-4">
                <p className="section-title">Filing a state RTI</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  State RTIs are filed with your state's RTI portal or the State Public Information
                  Officer. The request will still be prepared here — download it and submit through
                  your state's channel.
                </p>
              </div>
            )}

            {reformulation_suggestion && (!is_rti_suitable || cameFromGrievance) && (
              <div className="panel p-6 mt-4">
                <p className="section-title">Suggested wording</p>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{reformulation_suggestion}</p>
              </div>
            )}

            <div className="mt-6">
              <p className="font-semibold text-slate-900">Need something fixed instead?</p>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed max-w-lg">
                Choose the grievance path when the goal is to get a problem resolved rather than obtain
                information.
              </p>
            </div>
          </div>

          <aside>
            <div className="panel p-6">
              <h3 className="section-title">What RTI is for</h3>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                RTI is useful for obtaining existing records, documents, figures, orders, reports, and
                other information held by public authorities.
              </p>
              <div className="divider mt-4 pt-4 grid grid-cols-2 gap-3">
                <div>
                  <p className="section-label">Subject</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">{CATEGORY_LABELS[category]}</p>
                </div>
                <div>
                  <p className="section-label">Level</p>
                  <p className="text-sm font-medium text-slate-800 mt-1">
                    {jurisdiction === 'central' ? 'Central' : 'State'}
                  </p>
                </div>
              </div>
            </div>

            <button onClick={() => navigate('/authority')} className="btn-primary w-full mt-4">
              {isSuitable ? 'Continue to authority' : 'Continue anyway'}
            </button>
            {grievance?.detected ? (
              <button
                onClick={() => setBranch('reframe')}
                className="block w-full text-center text-sm font-medium text-primary-800 hover:underline mt-3"
              >
                ← Back to reframing
              </button>
            ) : (
              <button
                onClick={() => navigate('/')}
                className="block w-full text-center text-sm font-medium text-slate-500 hover:text-slate-800 mt-3"
              >
                ← Change my request
              </button>
            )}
          </aside>
        </div>
      </div>
      <AppFooter />
    </div>
  )
}
