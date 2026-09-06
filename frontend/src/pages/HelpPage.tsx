import { Link } from 'react-router-dom'
import { AppHeader } from '../components/common/AppHeader'
import { AppFooter } from '../components/common/AppFooter'
import { Breadcrumb } from '../components/common/Breadcrumb'

const FAQ: { q: string; a: string }[] = [
  {
    q: 'What is an RTI request?',
    a: 'Under the Right to Information Act, 2005, any citizen of India can ask a public authority for information it holds. The authority must respond within 30 days.',
  },
  {
    q: 'When is RTI not the right route?',
    a: 'RTI is for obtaining information and records. If you want the government to fix a problem or take an action, that is a grievance and goes through a different channel. RTI Navigator will tell you which situation you are in.',
  },
  {
    q: 'How does RTI Navigator pick an authority?',
    a: 'It matches the subject, jurisdiction and key terms of your request against a list of public authorities and shows why each one was suggested, along with a match-confidence figure. You can always choose a different authority.',
  },
  {
    q: 'What happens if there is no response in 30 days?',
    a: 'RTI Navigator tracks the deadline. Once it passes, you can prepare a First Appeal under Section 19(1) of the Act, edit it, and keep a copy.',
  },
  {
    q: 'Is anything actually filed?',
    a: 'No. This is a demonstration. Login, payment and submission are simulated and clearly labelled. Nothing is sent to a government system.',
  },
]

export default function HelpPage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <AppHeader />
      <div className="page animate-slide-up">
        <Breadcrumb items={[{ label: 'Home', to: '/' }, { label: 'Help' }]} />
        <h1 className="page-title">Help</h1>
        <p className="page-subtitle">
          How RTI Navigator works and what to expect at each step.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FAQ.map((item) => (
            <div key={item.q} className="panel p-5 sm:p-6">
              <p className="font-medium text-slate-900">{item.q}</p>
              <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">{item.a}</p>
            </div>
          ))}
        </div>

        <p className="text-sm text-slate-500 mt-8">
          Ready to start?{' '}
          <Link to="/" className="text-primary-800 font-medium hover:underline">
            Describe what you need
          </Link>
          .
        </p>
      </div>
      <AppFooter />
    </div>
  )
}
