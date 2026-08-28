/**
 * "What is real vs what is mocked" — required by the hackathon brief.
 * Rendered on the Dashboard so reviewers see it without reading code.
 */
const REAL: { label: string; detail: string }[] = [
  { label: 'AI intent analysis', detail: 'Real GPT-4o-mini; rehearsed deterministic fallback when no API key is set' },
  { label: 'RTI suitability & jurisdiction', detail: 'Deterministic rules engine — central vs state, suitable vs not' },
  { label: 'Authority recommendation', detail: 'Keyword + category scoring over 35 curated Indian authorities' },
  { label: '5 draft quality checks', detail: 'Deterministic — authority, jurisdiction, specificity, character limit, information request' },
]

const SIMULATED: { label: string; detail: string }[] = [
  { label: 'Mobile OTP', detail: 'Accepts demo OTP 123456 — no SMS is sent' },
  { label: 'Payment ₹10', detail: 'Success / failure buttons — no payment provider is called' },
  { label: 'Government submission', detail: 'Generates a demo registration number (RTI/YYYY/NNNNN) — nothing is filed' },
  { label: 'Status timeline', detail: 'Synthetic lifecycle events — no live government status is fetched' },
]

export function DisclosureCard() {
  return (
    <div className="card mb-8">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-1">
        Transparency
      </p>
      <h2 className="text-base font-bold text-slate-800 mb-4">What works vs what is mocked</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wider mb-2">
            ✅ Real / deterministic
          </p>
          <ul className="space-y-2">
            {REAL.map((r) => (
              <li key={r.label} className="text-sm">
                <span className="font-semibold text-slate-700">{r.label}</span>
                <span className="text-slate-500"> — {r.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold text-amber-700 uppercase tracking-wider mb-2">
            ⚙️ Simulated
          </p>
          <ul className="space-y-2">
            {SIMULATED.map((s) => (
              <li key={s.label} className="text-sm">
                <span className="font-semibold text-slate-700">{s.label}</span>
                <span className="text-slate-500"> — {s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
        Demo state is stored in your browser (localStorage). Use “Demo reset” above to start over.
        Works offline / on slow connections — pages are lightweight and nothing streams.
      </p>
    </div>
  )
}
