/**
 * "What is real vs what is mocked" — required by the hackathon brief.
 * Rendered on the Dashboard so reviewers see it without reading code.
 */
const REAL: { label: string; detail: string }[] = [
  { label: 'Intent analysis', detail: 'Deterministic signal extraction from the request text' },
  { label: 'Suitability & jurisdiction', detail: 'Rules engine — central vs state, suitable vs not' },
  { label: 'Authority recommendation', detail: 'Keyword and category scoring over a curated list of authorities' },
  { label: 'Five request checks', detail: 'Authority, jurisdiction, specificity, character limit, information request' },
]

const SIMULATED: { label: string; detail: string }[] = [
  { label: 'Mobile OTP', detail: 'Accepts demo OTP 123456 — no SMS is sent' },
  { label: 'Payment ₹10', detail: 'Success / failure buttons — no payment provider is called' },
  { label: 'Government submission', detail: 'Generates a demo registration number (RTI/YYYY/NNNNN) — nothing is filed' },
  { label: 'Status timeline', detail: 'Synthetic lifecycle events — no live government status is fetched' },
]

export function DisclosureCard() {
  return (
    <div className="panel p-5 sm:p-6 mb-6">
      <p className="section-label mb-3">What is real and what is simulated</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Real / deterministic</p>
          <ul className="space-y-2">
            {REAL.map((r) => (
              <li key={r.label} className="text-sm">
                <span className="font-medium text-slate-700">{r.label}</span>
                <span className="text-slate-500"> — {r.detail}</span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">Simulated</p>
          <ul className="space-y-2">
            {SIMULATED.map((s) => (
              <li key={s.label} className="text-sm">
                <span className="font-medium text-slate-700">{s.label}</span>
                <span className="text-slate-500"> — {s.detail}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <p className="text-xs text-slate-400 mt-4 pt-3 border-t border-slate-100">
        Demo state is stored in your browser. Use “Reset demo” to start over. Pages are lightweight
        and work on slow connections.
      </p>
    </div>
  )
}
