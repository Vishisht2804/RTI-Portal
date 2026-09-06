/**
 * DemoTimeControls — clearly-labelled prototype time-travel panel.
 *
 * Lets a reviewer advance the demo clock to demonstrate deadline detection
 * without waiting 30 days. Shows current demo date and offers step controls.
 *
 * This component is only meaningful in DEMO_MODE — hide it in production builds.
 */
import React, { useState } from 'react'
import { Clock, FastForward, RotateCcw } from 'lucide-react'
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

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 border border-violet-200 rounded-xl text-xs">
        <Clock size={11} className="text-violet-500 shrink-0" />
        <span className="font-bold text-violet-600 uppercase tracking-wider">Demo Time</span>
        <span className={`font-mono font-semibold ${isAdvanced ? 'text-violet-800' : 'text-slate-500'}`}>
          {displayDate}
        </span>
        <div className="flex items-center gap-1 ml-1">
          <button
            onClick={() => advance(7)}
            disabled={busy}
            title="Advance demo clock by 7 days"
            className="px-2 py-0.5 rounded bg-violet-100 hover:bg-violet-200 text-violet-700 font-semibold transition-colors disabled:opacity-50"
          >
            +7d
          </button>
          <button
            onClick={() => advance(31)}
            disabled={busy}
            title="Fast-forward 31 days (makes response overdue)"
            className="px-2 py-0.5 rounded bg-violet-600 hover:bg-violet-700 text-white font-semibold transition-colors disabled:opacity-50"
          >
            +31d
          </button>
          {isAdvanced && (
            <button
              onClick={reset}
              disabled={busy}
              title="Reset demo clock to today"
              className="p-0.5 rounded hover:bg-violet-100 text-violet-500 transition-colors disabled:opacity-50"
            >
              <RotateCcw size={11} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="border border-violet-200 rounded-2xl bg-violet-50 p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 rounded-full bg-violet-600 flex items-center justify-center">
          <Clock size={12} className="text-white" />
        </div>
        <span className="text-xs font-bold uppercase tracking-widest text-violet-600">
          Demo Time Travel
        </span>
        <span className="ml-auto text-[10px] text-violet-400 font-medium border border-violet-200 rounded-full px-2 py-0.5">
          Prototype only
        </span>
      </div>

      {/* Current demo date */}
      <div className="mb-3">
        <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-0.5">
          Current demo date
        </p>
        <p className={`text-lg font-bold font-mono ${isAdvanced ? 'text-violet-800' : 'text-slate-500'}`}>
          {displayDate}
        </p>
        {isAdvanced && (
          <p className="text-[10px] text-violet-500 mt-0.5">
            ⚡ Time is advanced — deadline calculations use this date
          </p>
        )}
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => advance(7)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 hover:border-violet-400 text-violet-700 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <FastForward size={11} /> +7 days
        </button>
        <button
          onClick={() => advance(30)}
          disabled={busy}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-violet-200 hover:border-violet-400 text-violet-700 text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <FastForward size={11} /> +30 days
        </button>
        <button
          onClick={() => advance(31)}
          disabled={busy}
          title="Advance to 31 days — makes response overdue by 1 day"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-semibold transition-colors disabled:opacity-50"
        >
          <FastForward size={11} /> +31 days
        </button>
        {isAdvanced && (
          <button
            onClick={reset}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-slate-300 text-slate-500 text-xs font-semibold transition-colors disabled:opacity-50 ml-auto"
          >
            <RotateCcw size={11} /> Reset time
          </button>
        )}
      </div>
    </div>
  )
}
