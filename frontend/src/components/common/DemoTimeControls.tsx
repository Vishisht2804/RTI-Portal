/**
 * DemoTimeControls — clearly-labelled prototype time controls.
 *
 * Lets a reviewer advance the demo clock to demonstrate deadline detection
 * without waiting 30 days. Only meaningful in DEMO_MODE.
 */
import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { formatShortDate } from '../../utils/deadline'
import { DEMO_MODE } from '../../services/demo/config'

interface Props {
  demoNow: string | null
  onTimeChange: () => void
  onAdvance: (days: number) => Promise<void>
  onReset: () => Promise<void>
  compact?: boolean
}

export function DemoTimeControls({ demoNow, onTimeChange, onAdvance, onReset, compact = false }: Props) {
  if (!DEMO_MODE) return null
  const [busy, setBusy] = useState(false)

  const displayDate = demoNow ? formatShortDate(demoNow) : formatShortDate(new Date().toISOString())
  const isAdvanced = Boolean(demoNow)

  async function advance(days: number) {
    setBusy(true)
    try { await onAdvance(days); onTimeChange() } finally { setBusy(false) }
  }
  async function reset() {
    setBusy(true)
    try { await onReset(); onTimeChange() } finally { setBusy(false) }
  }

  const stepBtn =
    'px-2 py-1 rounded border border-slate-300 bg-white text-slate-600 font-medium ' +
    'hover:border-slate-400 transition-colors disabled:opacity-50'

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs">
        <span className="font-medium text-slate-400 uppercase tracking-wide">Demo date</span>
        <span className={`font-mono ${isAdvanced ? 'text-slate-800 font-medium' : 'text-slate-500'}`}>
          {displayDate}
        </span>
        <div className="flex items-center gap-1 ml-1">
          <button onClick={() => advance(7)} disabled={busy} title="Advance 7 days" className={stepBtn}>+7d</button>
          <button onClick={() => advance(31)} disabled={busy} title="Advance 31 days" className={stepBtn}>+31d</button>
          {isAdvanced && (
            <button onClick={reset} disabled={busy} title="Reset to today"
              className="p-1 rounded text-slate-400 hover:text-slate-700 disabled:opacity-50">
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="section-label">Demo time controls</span>
        <span className="text-[11px] text-slate-400">Prototype only</span>
      </div>
      <p className="text-[11px] text-slate-400 mb-0.5">Current demo date</p>
      <p className={`text-base font-mono font-medium ${isAdvanced ? 'text-slate-900' : 'text-slate-500'}`}>
        {displayDate}
      </p>
      {isAdvanced && (
        <p className="text-[11px] text-slate-400 mt-0.5">
          Deadline calculations use this date instead of today.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        <button onClick={() => advance(7)} disabled={busy} className={stepBtn}>+7 days</button>
        <button onClick={() => advance(30)} disabled={busy} className={stepBtn}>+30 days</button>
        <button onClick={() => advance(31)} disabled={busy} className={stepBtn}>+31 days</button>
        {isAdvanced && (
          <button onClick={reset} disabled={busy}
            className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded border border-slate-300 bg-white text-slate-500 text-xs hover:border-slate-400 disabled:opacity-50">
            <RotateCcw size={11} /> Reset time
          </button>
        )}
      </div>
    </div>
  )
}
