/**
 * DeadlineDisplay — RTI deadline status.
 * Neutral for waiting, amber for due today, red for overdue. Date logic in deadline.ts.
 */
import { formatFriendlyDate } from '../../utils/deadline'

interface Props {
  responseDueAt: string | null
  isOverdue: boolean
  daysRemaining: number | null
  daysOverdueCount: number
}

export function DeadlineDisplay({ responseDueAt, isOverdue, daysRemaining, daysOverdueCount }: Props) {
  if (!responseDueAt) return null

  const dueFormatted = formatFriendlyDate(responseDueAt)
  const isDueToday = daysRemaining === 0

  if (isOverdue) {
    return (
      <div className="rounded-lg border border-slate-200 border-l-2 border-l-red-500 p-3.5">
        <p className="text-sm font-medium text-slate-900">Response overdue</p>
        <p className="text-xs text-slate-500 mt-0.5">
          {daysOverdueCount} day{daysOverdueCount !== 1 ? 's' : ''} overdue · was due {dueFormatted}
        </p>
        <p className="text-xs text-slate-500 mt-0.5">No response recorded.</p>
      </div>
    )
  }

  if (isDueToday) {
    return (
      <div className="rounded-lg border border-slate-200 border-l-2 border-l-amber-500 p-3.5">
        <p className="text-sm font-medium text-slate-900">Response due today</p>
        <p className="text-xs text-slate-500 mt-0.5">Due {dueFormatted}</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-slate-200 p-3.5">
      <p className="text-sm font-medium text-slate-900">
        Response due in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
      </p>
      <p className="text-xs text-slate-500 mt-0.5">Due {dueFormatted}</p>
    </div>
  )
}

/** Inline text version for list views. */
export function DeadlineBadge({ isOverdue, daysRemaining, daysOverdueCount }: Omit<Props, 'responseDueAt'>) {
  if (daysRemaining === null) return null

  if (isOverdue) {
    return <span className="text-xs font-medium text-red-700">{daysOverdueCount}d overdue</span>
  }
  if (daysRemaining === 0) {
    return <span className="text-xs font-medium text-amber-700">Due today</span>
  }
  return <span className="text-xs text-slate-500">Due in {daysRemaining}d</span>
}
