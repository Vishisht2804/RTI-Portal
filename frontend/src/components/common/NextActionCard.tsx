/**
 * NextActionCard — tells the citizen what to do next.
 *   INCOMPLETE  → Complete applicant details
 *   NORMAL      → Waiting (days remaining)
 *   DUE_TODAY   → Response due today
 *   OVERDUE     → Response overdue — Generate First Appeal
 */
import { ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'

interface NextAction {
  title: string
  description: string
  action?: string
  action_url?: string
}

interface Props {
  nextAction: NextAction
  isOverdue?: boolean
  daysRemaining?: number | null
  daysOverdueCount?: number
  onGenerateAppeal?: () => void
  generating?: boolean
  rtiId?: number
}

export function NextActionCard({
  nextAction,
  isOverdue = false,
  daysRemaining,
  daysOverdueCount = 0,
  onGenerateAppeal,
  generating = false,
}: Props) {
  const action = nextAction.action

  // OVERDUE
  if (action === 'generate_appeal' || isOverdue) {
    return (
      <div className="rounded-lg border border-slate-200 border-l-2 border-l-red-500 p-4">
        <p className="text-sm font-medium text-slate-900">Response overdue</p>
        <p className="text-sm text-slate-600 mt-1 leading-relaxed">
          Your RTI has passed its expected response period.
          {daysOverdueCount > 0 && ` It is ${daysOverdueCount} day${daysOverdueCount !== 1 ? 's' : ''} past the 30-day limit.`}
        </p>
        <p className="text-sm text-slate-600 mt-2">{nextAction.description}</p>
        {onGenerateAppeal && (
          <button
            onClick={onGenerateAppeal}
            disabled={generating}
            className="btn-primary text-sm mt-3 flex items-center gap-2 disabled:opacity-60"
          >
            {generating ? 'Preparing…' : 'Generate First Appeal'}
            {!generating && <ChevronRight size={14} />}
          </button>
        )}
      </div>
    )
  }

  // DUE TODAY
  if (daysRemaining === 0) {
    return (
      <div className="rounded-lg border border-slate-200 border-l-2 border-l-amber-500 p-4">
        <p className="text-sm font-medium text-slate-900">Response due today</p>
        <p className="text-sm text-slate-600 mt-1">{nextAction.description}</p>
      </div>
    )
  }

  // INCOMPLETE (filing in progress)
  if (action === 'continue' || action === 'pay' || action === 'retry_payment' || action === 'review') {
    return (
      <div className="rounded-lg border border-slate-200 border-l-2 border-l-primary-600 p-4">
        <p className="text-sm font-medium text-slate-900">{nextAction.title}</p>
        <p className="text-sm text-slate-600 mt-1">{nextAction.description}</p>
        {nextAction.action_url && (
          <Link
            to={nextAction.action_url}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-primary-800 hover:underline mt-2"
          >
            Continue <ChevronRight size={14} />
          </Link>
        )}
      </div>
    )
  }

  // NORMAL — waiting / all set
  return (
    <div className="rounded-lg border border-slate-200 p-4">
      <p className="text-sm font-medium text-slate-900">{nextAction.title}</p>
      <p className="text-sm text-slate-600 mt-1">{nextAction.description}</p>
      {typeof daysRemaining === 'number' && daysRemaining > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  )
}
