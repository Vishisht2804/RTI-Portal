/**
 * DeadlineDisplay — compact RTI deadline status indicator.
 *
 * Neutral/positive for days remaining, warning for due today,
 * strong critical for overdue. Keeps date logic in deadline.ts.
 */
import React from 'react'
import { CalendarClock, AlertTriangle, CheckCircle2, AlertCircle } from 'lucide-react'
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

  // — Overdue —
  if (isOverdue) {
    return (
      <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertCircle size={16} className="text-red-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-red-700">Response overdue</p>
          <p className="text-xs text-red-600 mt-0.5">
            {daysOverdueCount} day{daysOverdueCount !== 1 ? 's' : ''} overdue · Due {dueFormatted}
          </p>
          <p className="text-xs text-red-500 mt-1">No response recorded</p>
        </div>
      </div>
    )
  }

  // — Due today —
  if (isDueToday) {
    return (
      <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
          <AlertTriangle size={16} className="text-amber-600" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-700">Response due today</p>
          <p className="text-xs text-amber-600 mt-0.5">Due {dueFormatted}</p>
        </div>
      </div>
    )
  }

  // — Waiting (days remaining) —
  return (
    <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
        <CalendarClock size={16} className="text-blue-600" />
      </div>
      <div>
        <p className="text-sm font-semibold text-blue-800">
          Response due in {daysRemaining} day{daysRemaining !== 1 ? 's' : ''}
        </p>
        <p className="text-xs text-blue-600 mt-0.5">Due {dueFormatted}</p>
      </div>
    </div>
  )
}

/** Inline badge version for list views. */
export function DeadlineBadge({ isOverdue, daysRemaining, daysOverdueCount }: Omit<Props, 'responseDueAt'>) {
  if (daysRemaining === null) return null

  if (isOverdue) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-100 border border-red-200 rounded-full px-2 py-0.5">
        <AlertCircle size={10} />
        {daysOverdueCount}d overdue
      </span>
    )
  }
  if (daysRemaining === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded-full px-2 py-0.5">
        <AlertTriangle size={10} />
        Due today
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5">
      <CalendarClock size={10} />
      Due in {daysRemaining}d
    </span>
  )
}
