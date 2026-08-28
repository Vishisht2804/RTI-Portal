import type { ReactNode } from 'react'
import { AlertTriangleIcon } from 'lucide-react'

/**
 * Loud, consistent "this step is not real" banner.
 * Used on every Track B screen that performs a simulated action
 * (OTP, payment, government submission).
 */
export function SimulatedBanner({
  children,
}: {
  /** Optional extra line, e.g. the demo OTP or fee amount. */
  children?: ReactNode
}) {
  return (
    <div className="rounded-xl border-2 border-amber-300 bg-amber-50 px-4 py-3 mb-5 flex items-start gap-3">
      <AlertTriangleIcon size={18} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-bold text-amber-800 tracking-wide">
          SIMULATED — no real data is sent
        </p>
        <p className="text-amber-700 mt-0.5">
          This is a prototype for the hackathon. Nothing here contacts a real
          government system, SMS gateway, or payment provider.
        </p>
        {children && <div className="text-amber-800 mt-1.5 font-medium">{children}</div>}
      </div>
    </div>
  )
}
