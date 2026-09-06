/**
 * NextActionCard — reusable card that tells the citizen what to do next.
 *
 * Supports four states:
 *   INCOMPLETE  → Complete applicant details (filing in progress)
 *   NORMAL      → You're all set / waiting (days remaining)
 *   DUE_TODAY   → Response due today
 *   OVERDUE     → Action required — Generate First Appeal
 */
import React from 'react'
import { CheckCircle2, Clock, AlertTriangle, AlertCircle, ChevronRight, FileText } from 'lucide-react'
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

  // OVERDUE — most urgent treatment
  if (action === 'generate_appeal' || isOverdue) {
    return (
      <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shrink-0">
            <AlertCircle size={16} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-red-500">Action required</p>
            <p className="text-base font-bold text-red-800">Your RTI is overdue</p>
          </div>
        </div>

        <p className="text-sm text-red-700 mb-4 leading-relaxed">{nextAction.description}</p>

        {daysOverdueCount > 0 && (
          <p className="text-xs font-semibold text-red-600 mb-4">
            {daysOverdueCount} day{daysOverdueCount !== 1 ? 's' : ''} past the 30-day statutory limit
          </p>
        )}

        {onGenerateAppeal && (
          <button
            onClick={onGenerateAppeal}
            disabled={generating}
            className="flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-800 text-white rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
          >
            <FileText size={15} />
            {generating ? 'Generating…' : 'Generate First Appeal'}
            {!generating && <ChevronRight size={14} />}
          </button>
        )}
      </div>
    )
  }

  // DUE TODAY
  if (daysRemaining === 0) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <p className="text-sm font-bold text-amber-800">Response due today</p>
        </div>
        <p className="text-sm text-amber-700">{nextAction.description}</p>
      </div>
    )
  }

  // INCOMPLETE (filing in progress)
  if (action === 'continue' || action === 'pay' || action === 'retry_payment' || action === 'review') {
    return (
      <div className="rounded-2xl border border-primary-200 bg-primary-50 p-5">
        <div className="flex items-center gap-2 mb-2">
          <Clock size={18} className="text-primary-600 shrink-0" />
          <p className="text-sm font-bold text-primary-800">{nextAction.title}</p>
        </div>
        <p className="text-sm text-primary-700 mb-3">{nextAction.description}</p>
        {nextAction.action_url && (
          <Link
            to={nextAction.action_url}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary-700 hover:text-primary-900"
          >
            Continue <ChevronRight size={14} />
          </Link>
        )}
      </div>
    )
  }

  // NORMAL — waiting or all set
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50 p-5">
      <div className="flex items-center gap-2 mb-2">
        <CheckCircle2 size={18} className="text-emerald-500 shrink-0" />
        <p className="text-sm font-bold text-slate-700">{nextAction.title}</p>
      </div>
      <p className="text-sm text-slate-500">{nextAction.description}</p>
      {typeof daysRemaining === 'number' && daysRemaining > 0 && (
        <p className="text-xs text-slate-400 mt-2">
          {daysRemaining} day{daysRemaining !== 1 ? 's' : ''} remaining
        </p>
      )}
    </div>
  )
}
