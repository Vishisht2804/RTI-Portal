/**
 * HomeFlowAnimation — refined
 *
 * Design decisions:
 * - Stage durations increased to 2800–3200ms so every reveal has time to be read
 * - Fake window chrome removed; replaced with a clean step header
 * - SVG text in Stage 6 uses SVG transform attribute, not CSS (cross-browser reliable)
 * - Redundant content removed from Stage 1 and Stage 3
 * - Stage 5 step completion uses opacity only, no strikethrough
 * - Stage 7 tick thresholds adjusted so all checkmarks complete within the stage window
 * - Progress strip shows step count (3 / 8) rather than repeating the eyebrow label
 */

import { useEffect, useRef, useState, useCallback } from 'react'

type StageId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7

// Each stage duration in ms. Every sub-reveal must complete with ~400ms to spare.
const STAGE_DURATIONS: Record<StageId, number> = {
  0: 2800,  // 14 ticks — query + signal tags
  1: 2800,  // 14 ticks — 4 signals stagger + confirmation
  2: 3000,  // 15 ticks — verdict + supporting note
  3: 3200,  // 16 ticks — primary authority + bar fill + alternatives
  4: 3000,  // 15 ticks — 4 quality checks sequentially
  5: 3000,  // 15 ticks — 5 filing steps progress
  6: 3200,  // 16 ticks — deadline arc + 3 tracking checks
  7: 3200,  // 16 ticks — branch cards + full appeal sequence
}

const STAGE_LABELS: Record<StageId, string> = {
  0: 'Ask',
  1: 'Understand',
  2: 'Suitability',
  3: 'Route',
  4: 'Prepare',
  5: 'File',
  6: 'Protect',
  7: 'Outcome',
}

const TOTAL_STAGES = 8
const DEMO_QUERY = 'How much did the Ministry of Health spend on government hospitals in 2025?'

// ─── Primitives ───────────────────────────────────────────────────────────────

function Dot({ active, done }: { active: boolean; done: boolean }) {
  return (
    <span
      style={{
        display: 'inline-block',
        borderRadius: '9999px',
        transition: 'all 0.3s ease',
        width: active ? '12px' : '6px',
        height: '6px',
        background: active ? '#60a5fa' : done ? 'rgba(96,165,250,0.45)' : 'rgba(255,255,255,0.18)',
      }}
    />
  )
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300/65 mb-2.5">
      {children}
    </p>
  )
}

function Tag({ color = 'blue', children }: { color?: 'blue' | 'green' | 'amber' | 'slate'; children: React.ReactNode }) {
  const cls: Record<string, string> = {
    blue:  'bg-blue-500/20 text-blue-200 border-blue-400/30',
    green: 'bg-emerald-500/20 text-emerald-200 border-emerald-400/30',
    amber: 'bg-amber-500/20 text-amber-200 border-amber-400/30',
    slate: 'bg-white/10 text-white/50 border-white/12',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-[10px] font-semibold leading-none ${cls[color]}`}>
      {children}
    </span>
  )
}

function Checkmark({ done, children }: { done: boolean; children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-2 text-[12px]"
      style={{
        opacity: done ? 1 : 0,
        transform: done ? 'none' : 'translateY(3px)',
        transition: 'opacity 0.3s ease, transform 0.3s ease',
      }}
    >
      <span
        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
        style={{ background: 'rgba(16,185,129,0.25)', border: '1px solid rgba(52,211,153,0.45)' }}
      >
        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
          <path d="M1.5 4L3 5.5L6.5 2.5" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </span>
      <span className="text-white/75">{children}</span>
    </div>
  )
}

function Fade({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        opacity: show ? 1 : 0,
        transform: show ? 'none' : 'translateY(4px)',
        transition: 'opacity 0.35s ease, transform 0.35s ease',
      }}
    >
      {children}
    </div>
  )
}

// ─── Stages ───────────────────────────────────────────────────────────────────

function Stage0({ query, tick }: { query: string; tick: number }) {
  const display = query.length > 72 ? query.slice(0, 69) + '…' : query
  return (
    <div className="space-y-3">
      <Eyebrow>Your question</Eyebrow>
      {/* Query is primary content — show immediately, no fade delay */}
      <div
        className="rounded-lg px-4 py-3"
        style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.14)' }}
      >
        <p className="text-[13px] text-white leading-snug">"{display}"</p>
      </div>
      <Fade show={tick >= 4}>
        <div className="flex flex-wrap gap-1.5">
          <Tag color="blue">Central govt</Tag>
          <Tag color="blue">Health</Tag>
          <Tag color="blue">Expenditure</Tag>
          <Tag color="slate">2025</Tag>
        </div>
      </Fade>
    </div>
  )
}

function Stage1({ tick }: { tick: number }) {
  const signals = ['Health', 'Hospitals', 'Expenditure', 'Central']
  return (
    <div className="space-y-3">
      <Eyebrow>Extracting signals</Eyebrow>
      <div className="flex flex-wrap gap-1.5">
        {signals.map((s, i) => (
          <span
            key={s}
            style={{
              opacity: tick >= i + 1 ? 1 : 0,
              transform: tick >= i + 1 ? 'none' : 'translateY(3px)',
              transition: 'opacity 0.3s ease, transform 0.3s ease',
            }}
          >
            <Tag color="blue">{s}</Tag>
          </span>
        ))}
      </div>
      <Fade show={tick >= 8}>
        <div className="flex items-center gap-2">
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(59,130,246,0.3)', border: '1px solid rgba(96,165,250,0.5)' }}
          >
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <path d="M1.5 4L3 5.5L6.5 2.5" stroke="#93c5fd" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </span>
          <span className="text-[12px] text-blue-200 font-semibold">Intent understood</span>
          <span className="text-[11px] text-white/40 ml-1">· Category: Health · Central</span>
        </div>
      </Fade>
    </div>
  )
}

function Stage2({ tick, grievance }: { tick: number; grievance: boolean }) {
  return (
    <div className="space-y-3">
      <Eyebrow>Checking the right route</Eyebrow>
      {!grievance ? (
        <>
          <Fade show={tick >= 2}>
            <div
              className="rounded-lg px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(16,185,129,0.14)', border: '1px solid rgba(52,211,153,0.35)' }}
            >
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                style={{ background: 'rgba(16,185,129,0.35)', border: '1px solid rgba(52,211,153,0.55)' }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5L4 7L8 3" stroke="#6ee7b7" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </span>
              <div>
                <p className="text-[13px] font-semibold text-emerald-200">RTI is the right route</p>
                <p className="text-[11px] text-emerald-300/65 mt-0.5">Seeks records held by a central public authority</p>
              </div>
            </div>
          </Fade>
          <Fade show={tick >= 7}>
            <p className="text-[11px] text-white/45 px-1">Not a grievance · RTI Act 2005 § 6 applies</p>
          </Fade>
        </>
      ) : (
        <>
          <Fade show={tick >= 1}>
            <div
              className="rounded-lg px-4 py-3 flex items-center gap-3"
              style={{ background: 'rgba(245,158,11,0.14)', border: '1px solid rgba(251,191,36,0.35)' }}
            >
              <span className="text-amber-300 text-[15px] shrink-0">⚠</span>
              <div>
                <p className="text-[13px] font-semibold text-amber-200">Looks like a grievance</p>
                <p className="text-[11px] text-amber-300/65 mt-0.5">"The road outside my house is broken"</p>
              </div>
            </div>
          </Fade>
          <Fade show={tick >= 5}>
            <div className="grid grid-cols-2 gap-2">
              <div
                className="rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(251,191,36,0.28)' }}
              >
                <p className="text-[11px] font-semibold text-white/80">Get it fixed</p>
                <p className="text-[10px] text-white/40 mt-0.5">→ Grievance portal</p>
              </div>
              <div
                className="rounded-lg px-3 py-2.5"
                style={{ background: 'rgba(59,130,246,0.12)', border: '1px solid rgba(96,165,250,0.30)' }}
              >
                <p className="text-[11px] font-semibold text-blue-200">Get records</p>
                <p className="text-[10px] text-blue-300/60 mt-0.5">→ Continue with RTI</p>
              </div>
            </div>
          </Fade>
        </>
      )}
    </div>
  )
}

function Stage3({ tick }: { tick: number }) {
  const alts = [
    { name: 'CDSCO', pct: 31 },
    { name: 'Dept of Health', pct: 18 },
  ]
  return (
    <div className="space-y-3">
      <Eyebrow>Finding the right authority</Eyebrow>
      <Fade show={tick >= 1}>
        <div
          className="rounded-lg px-4 py-3"
          style={{ background: 'rgba(59,130,246,0.14)', border: '1px solid rgba(96,165,250,0.35)' }}
        >
          <p className="text-[10px] font-bold text-blue-300/65 uppercase tracking-wide mb-1.5">Primary match</p>
          <p className="text-[13px] font-bold text-white leading-snug">Ministry of Health &amp; Family Welfare</p>
          <div className="flex items-center gap-2 mt-2.5">
            <div
              className="flex-1 h-1.5 rounded-full overflow-hidden"
              style={{ background: 'rgba(255,255,255,0.10)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: tick >= 2 ? '92%' : '0%',
                  background: '#34d399',
                  transition: 'width 0.9s ease-out',
                }}
              />
            </div>
            <span className="text-[12px] font-bold text-emerald-300 tabular-nums">92%</span>
          </div>
          <p className="text-[10px] text-white/38 mt-0.5">match confidence</p>
        </div>
      </Fade>
      <Fade show={tick >= 7}>
        <div className="space-y-1.5">
          {alts.map((a) => (
            <div key={a.name} className="flex items-center gap-2 text-[11px] text-white/40">
              <span className="w-[88px] shrink-0">{a.name}</span>
              <div
                className="flex-1 h-0.5 rounded-full overflow-hidden"
                style={{ background: 'rgba(255,255,255,0.10)' }}
              >
                <div
                  className="h-full rounded-full"
                  style={{ width: `${a.pct}%`, background: 'rgba(255,255,255,0.28)' }}
                />
              </div>
              <span className="tabular-nums w-6 text-right">{a.pct}%</span>
            </div>
          ))}
        </div>
      </Fade>
    </div>
  )
}

function Stage4({ tick }: { tick: number }) {
  const checks = [
    { label: 'Authority identified', t: 3 },
    { label: 'Specificity',         t: 5 },
    { label: 'Phrasing',            t: 8 },
    { label: 'Character limit',     t: 10 },
  ]
  return (
    <div className="space-y-3">
      <Eyebrow>Preparing the request</Eyebrow>
      <Fade show={tick >= 1}>
        <p className="text-[11px] text-white/45">Generating RTI-ready draft…</p>
      </Fade>
      <div className="space-y-2.5 mt-1">
        {checks.map((c) => (
          <Checkmark key={c.label} done={tick >= c.t}>{c.label}</Checkmark>
        ))}
      </div>
      <Fade show={tick >= 12}>
        <Tag color="green">All checks passed · Draft verified</Tag>
      </Fade>
    </div>
  )
}

function Stage5({ tick }: { tick: number }) {
  const steps = ['Applicant details', 'Documents', '₹10 Payment', 'Review', 'Submit']
  // 5 steps over ~12 ticks (15 total, last 3 reserved for DEMO banner)
  const active = Math.min(Math.floor(tick / 2.2), steps.length - 1)
  return (
    <div className="space-y-3">
      <Eyebrow>Filing steps</Eyebrow>
      <div className="space-y-2">
        {steps.map((s, i) => {
          const done = i < active
          const current = i === active
          return (
            <div
              key={s}
              className="flex items-center gap-2.5 text-[12px]"
              style={{
                opacity: done ? 0.45 : current ? 1 : 0.22,
                transition: 'opacity 0.4s ease',
              }}
            >
              <span
                className="w-5 h-5 rounded-full border flex items-center justify-center shrink-0 text-[9px] font-bold"
                style={{
                  background: done
                    ? 'rgba(16,185,129,0.22)'
                    : current
                    ? 'rgba(59,130,246,0.32)'
                    : 'rgba(255,255,255,0.04)',
                  borderColor: done
                    ? 'rgba(52,211,153,0.55)'
                    : current
                    ? 'rgba(96,165,250,0.65)'
                    : 'rgba(255,255,255,0.18)',
                  color: done ? '#6ee7b7' : current ? '#93c5fd' : 'rgba(255,255,255,0.28)',
                  transition: 'all 0.35s ease',
                }}
              >
                {done ? '✓' : `0${i + 1}`}
              </span>
              <span style={{ color: current ? 'rgba(255,255,255,0.92)' : 'inherit', fontWeight: current ? '500' : 'normal' }}>
                {s}
              </span>
              {current && (
                <span
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{
                    background: '#60a5fa',
                    animation: 'pulse 1.8s ease-in-out infinite',
                  }}
                />
              )}
            </div>
          )
        })}
      </div>
      <Fade show={tick >= 12}>
        <div
          className="rounded px-2.5 py-1.5 text-[10px] font-bold tracking-[0.07em]"
          style={{
            background: 'rgba(245,158,11,0.10)',
            border: '1px solid rgba(251,191,36,0.25)',
            color: 'rgba(253,230,138,0.70)',
          }}
        >
          DEMO MODE · SIMULATED · NOTHING IS FILED
        </div>
      </Fade>
    </div>
  )
}

function Stage6({ tick }: { tick: number }) {
  // Arc from 0 → 65% over ticks 3–9
  const progress = tick >= 3 ? Math.min((tick - 3) * 11, 65) : 0
  const r = 24
  const circ = 2 * Math.PI * r
  const offset = circ * (1 - progress / 100)

  return (
    <div className="space-y-3">
      <Eyebrow>Response protection</Eyebrow>
      <Fade show={tick >= 1}>
        <div
          className="rounded-lg px-4 py-3 flex items-center gap-4"
          style={{ background: 'rgba(59,130,246,0.10)', border: '1px solid rgba(96,165,250,0.28)' }}
        >
          {/* SVG arc — rotate(-90) on the SVG itself; text counter-rotated via SVG transform attribute */}
          <svg width="60" height="60" viewBox="0 0 60 60" className="shrink-0" style={{ transform: 'rotate(-90deg)' }}>
            <circle cx="30" cy="30" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4.5" />
            <circle
              cx="30" cy="30" r={r} fill="none"
              stroke="#60a5fa" strokeWidth="4.5" strokeLinecap="round"
              strokeDasharray={circ}
              strokeDashoffset={offset}
              style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
            />
            {/* SVG transform attribute is cross-browser reliable; CSS transform on SVG text is not */}
            <text
              x="30" y="30"
              textAnchor="middle" dominantBaseline="central"
              fill="rgba(255,255,255,0.72)"
              fontSize="9.5" fontWeight="700" fontFamily="system-ui, sans-serif"
              transform="rotate(90, 30, 30)"
            >
              30d
            </text>
          </svg>
          <div>
            <p className="text-[13px] font-bold text-white">30-day response window</p>
            <p className="text-[11px] text-white/50 mt-0.5">Deadline tracked automatically</p>
          </div>
        </div>
      </Fade>
      <div className="space-y-2.5">
        <Checkmark done={tick >= 5}>Automatic deadline tracking</Checkmark>
        <Checkmark done={tick >= 7}>Status monitoring</Checkmark>
        <Checkmark done={tick >= 9}>Next-step guidance</Checkmark>
      </div>
      <Fade show={tick >= 11}>
        <p className="text-[11px] font-semibold text-blue-300/75">
          RTI Navigator doesn't stop at filing.
        </p>
      </Fade>
    </div>
  )
}

function Stage7({ tick }: { tick: number }) {
  // First show YES path, then switch to OVERDUE at tick 5
  const overdue = tick >= 5
  return (
    <div className="space-y-3">
      <Eyebrow>Response received?</Eyebrow>
      <Fade show={tick >= 1}>
        <div className="grid grid-cols-2 gap-2">
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{
              borderColor: !overdue ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.10)',
              background: !overdue ? 'rgba(16,185,129,0.15)' : 'rgba(255,255,255,0.04)',
              opacity: !overdue ? 1 : 0.38,
              transition: 'all 0.5s ease',
            }}
          >
            <p className="text-[11px] font-bold text-emerald-200">YES</p>
            <p className="text-[10px] text-emerald-300/70 mt-0.5">Review &amp; act</p>
          </div>
          <div
            className="rounded-lg border px-3 py-2.5"
            style={{
              borderColor: overdue ? 'rgba(239,68,68,0.45)' : 'rgba(255,255,255,0.10)',
              background: overdue ? 'rgba(239,68,68,0.15)' : 'rgba(255,255,255,0.04)',
              opacity: overdue ? 1 : 0.38,
              transition: 'all 0.5s ease',
            }}
          >
            <p className="text-[11px] font-bold text-red-200">OVERDUE</p>
            <p className="text-[10px] text-red-300/70 mt-0.5">First Appeal →</p>
          </div>
        </div>
      </Fade>
      {overdue ? (
        <Fade show={tick >= 6}>
          <div
            className="rounded-lg px-4 py-3 space-y-2"
            style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.30)' }}
          >
            <p className="text-[10px] font-bold text-red-300/75 uppercase tracking-wide mb-2">First Appeal</p>
            <Checkmark done={tick >= 8}>Generate appeal document</Checkmark>
            <Checkmark done={tick >= 10}>Edit &amp; review</Checkmark>
            <Checkmark done={tick >= 12}>Submit to First Appellate Authority</Checkmark>
          </div>
        </Fade>
      ) : (
        <Fade show={tick >= 2}>
          <div
            className="rounded-lg px-4 py-3"
            style={{ background: 'rgba(16,185,129,0.12)', border: '1px solid rgba(52,211,153,0.28)' }}
          >
            <p className="text-[12px] font-semibold text-emerald-200">Response received</p>
            <p className="text-[11px] text-emerald-300/60 mt-0.5">Review records · Take next steps</p>
          </div>
        </Fade>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface HomeFlowAnimationProps {
  query?: string
}

export function HomeFlowAnimation({ query = '' }: HomeFlowAnimationProps) {
  const prefersReduced =
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const displayQuery = query.trim().length >= 10 ? query.trim() : DEMO_QUERY

  const [stage, setStage] = useState<StageId>(0)
  const [tick, setTick] = useState(0)
  const [paused, setPaused] = useState(false)
  const [loop, setLoop] = useState(0)

  const stageRef = useRef(stage)
  const pausedRef = useRef(paused)
  stageRef.current = stage
  pausedRef.current = paused

  const advance = useCallback(() => {
    const next = ((stageRef.current + 1) % TOTAL_STAGES) as StageId
    if (next === 0) setLoop((l) => l + 1)
    setStage(next)
    setTick(0)
  }, [])

  // Tick clock — 200ms per tick
  useEffect(() => {
    if (prefersReduced) return
    const id = setInterval(() => {
      if (!pausedRef.current) setTick((t) => t + 1)
    }, 200)
    return () => clearInterval(id)
  }, [prefersReduced])

  // Stage advance timer — restarts when stage or paused changes
  useEffect(() => {
    if (prefersReduced || paused) return
    const id = setTimeout(advance, STAGE_DURATIONS[stage])
    return () => clearTimeout(id)
  }, [stage, paused, advance, prefersReduced])

  // Grievance variant on odd loops (second time through the cycle)
  const showGrievance = loop % 2 === 1

  // ── Reduced-motion static fallback ──────────────────────────────────────────
  if (prefersReduced) {
    return (
      <div
        className="rounded-xl p-5 text-white"
        style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
        aria-label="RTI Navigator workflow summary"
      >
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-300/65 mb-3">How it works</p>
        <ol className="space-y-2.5 text-[12px] text-white/65">
          {[
            'Ask a question in plain language',
            'System extracts domain signals and classifies intent',
            'Checks whether RTI applies (vs. grievance)',
            'Identifies the correct public authority with a confidence score',
            'Prepares and validates the RTI draft against four checks',
            'Guides the filing process (₹10 fee, simulated in demo)',
            'Tracks the 30-day response deadline automatically',
            'Helps prepare a First Appeal if no response arrives',
          ].map((s, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <span className="text-blue-400/80 font-bold tabular-nums text-[10px] mt-0.5 shrink-0">
                {String(i + 1).padStart(2, '0')}
              </span>
              <span>{s}</span>
            </li>
          ))}
        </ol>
      </div>
    )
  }

  function renderStage() {
    switch (stage) {
      case 0: return <Stage0 query={displayQuery} tick={tick} />
      case 1: return <Stage1 tick={tick} />
      case 2: return <Stage2 tick={tick} grievance={showGrievance} />
      case 3: return <Stage3 tick={tick} />
      case 4: return <Stage4 tick={tick} />
      case 5: return <Stage5 tick={tick} />
      case 6: return <Stage6 tick={tick} />
      case 7: return <Stage7 tick={tick} />
    }
  }

  return (
    <div
      role="img"
      aria-label="Animated walkthrough of the RTI Navigator workflow"
      className="w-full"
    >
      <button
        type="button"
        onClick={() => setPaused((p) => !p)}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/50 rounded-xl"
        aria-label={paused ? 'Resume walkthrough' : 'Pause walkthrough'}
      >
        <div
          className="relative rounded-xl overflow-hidden select-none"
          style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.13)' }}
        >
          {/* Step header — clean, no fake window chrome */}
          <div
            className="flex items-center justify-between px-4 py-2.5"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">
              {STAGE_LABELS[stage]}
            </span>
            <span className="text-[10px] text-white/28 tabular-nums">
              {paused ? 'paused' : `${stage + 1} / ${TOTAL_STAGES}`}
            </span>
          </div>

          {/* Stage content — min-height prevents layout shift between stages */}
          <div
            key={stage}
            className="px-4 py-4"
            style={{
              minHeight: '190px',
              animation: 'rti-slide-in 0.3s ease-out both',
            }}
          >
            {renderStage()}
          </div>

          {/* Progress dots */}
          <div
            className="flex items-center gap-1.5 px-4 pb-3.5 pt-2.5"
            style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
          >
            {Array.from({ length: TOTAL_STAGES }).map((_, i) => (
              <Dot key={i} active={i === stage} done={i < stage} />
            ))}
          </div>
        </div>
      </button>
    </div>
  )
}
