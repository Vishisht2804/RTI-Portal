import { Link } from 'react-router-dom'
import { AppHeader } from '../components/common/AppHeader'
import { AppFooter } from '../components/common/AppFooter'
import { Breadcrumb } from '../components/common/Breadcrumb'

const STEPS: { n: string; title: string; body: string }[] = [
  {
    n: '01',
    title: 'Understand',
    body: 'Describe what you need in plain language. RTI Navigator checks whether the Right to Information Act is the right route, and whether the matter is central or state.',
  },
  {
    n: '02',
    title: 'Find the authority',
    body: 'The request is matched to the public authority most likely to hold the records, with the reasons shown and a match-confidence figure. If more than one authority is plausible, you are asked one clarifying question.',
  },
  {
    n: '03',
    title: 'Prepare the request',
    body: 'A clear, specific draft is prepared and addressed to the right Public Information Officer. You can edit every line. Five checks confirm it meets the requirements of the Act.',
  },
  {
    n: '04',
    title: 'File',
    body: 'Add your applicant details, complete the (simulated) verification and ₹10 fee, and submit. A registration number is issued for your records.',
  },
  {
    n: '05',
    title: 'Follow up',
    body: 'The 30-day response deadline is tracked. If it passes with no reply, a First Appeal under Section 19(1) is prepared for you to review, edit and keep.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />
      <div className="page animate-slide-up">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'How it works' }]} />
        <h1 className="page-title">How it works</h1>
        <p className="page-subtitle measure">
          RTI Navigator takes you from a plain-language question to a filed Right to Information
          request — and keeps helping until you have a response.
        </p>

        <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((s) => (
            <li key={s.n} className="panel p-5 sm:p-6">
              <span className="text-sm font-semibold text-primary-700 tabular-nums">{s.n}</span>
              <p className="section-title mt-2">{s.title}</p>
              <p className="text-[15px] text-slate-600 leading-relaxed mt-1.5">{s.body}</p>
            </li>
          ))}
        </ol>

        <p className="mt-8 text-[15px] text-slate-500">
          <Link to="/" className="text-primary-800 font-medium hover:underline">Start a request</Link>
          {' '}or{' '}
          <Link to="/help" className="text-primary-800 font-medium hover:underline">read common questions</Link>.
        </p>
      </div>
      <AppFooter />
    </div>
  )
}
