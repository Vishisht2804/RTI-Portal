/**
 * WorkflowNav — restrained numbered progress indicator for the RTI journey.
 * Typography + subtle separators, no circles or decorative graphics.
 *
 * `current` is 1-based across five phases. Track A wizard steps map onto these:
 *   Query / Suitability → 1 Understand
 *   Authority           → 2 Authority
 *   Draft / Review      → 3 Request
 *   Ready to file       → 4 File
 *   Filing / tracking   → 5 Follow up
 */

const PHASES = ['Understand', 'Authority', 'Request', 'File', 'Follow up'] as const

export function WorkflowNav({ current }: { current: number }) {
  const cur = Math.min(Math.max(current, 1), PHASES.length)

  return (
    <div className="w-full bg-white border-b border-slate-200">
      <nav className="shell py-3" aria-label="Progress">
        {/* Mobile: compact */}
        <p className="sm:hidden text-sm text-slate-500">
          <span className="font-medium text-slate-900">Step {cur} of {PHASES.length}</span>
          <span className="mx-1.5 text-slate-300">·</span>
          {PHASES[cur - 1]}
        </p>

        {/* Desktop: full numbered row */}
        <ol className="hidden sm:flex items-center gap-1 text-sm">
          {PHASES.map((label, i) => {
            const n = i + 1
            const state = n < cur ? 'done' : n === cur ? 'current' : 'future'
            return (
              <li key={label} className="flex items-center">
                <span
                  className={[
                    'inline-flex items-baseline gap-2 px-2 py-1',
                    state === 'current' ? 'text-slate-900' : '',
                    state === 'done' ? 'text-slate-500' : '',
                    state === 'future' ? 'text-slate-300' : '',
                  ].join(' ')}
                  aria-current={state === 'current' ? 'step' : undefined}
                >
                  <span className="tabular-nums text-xs font-semibold tracking-wide">
                    {String(n).padStart(2, '0')}
                  </span>
                  <span className={state === 'current' ? 'font-medium' : ''}>{label}</span>
                </span>
                {n < PHASES.length && (
                  <span className="mx-1 h-4 w-px bg-slate-200" aria-hidden />
                )}
              </li>
            )
          })}
        </ol>
      </nav>
    </div>
  )
}
