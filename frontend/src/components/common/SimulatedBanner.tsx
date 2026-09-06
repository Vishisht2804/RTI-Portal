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
    <div className="rounded-lg border border-slate-200 border-l-2 border-l-amber-500 px-4 py-3 mb-5 flex items-start gap-2.5">
      <AlertTriangleIcon size={15} className="text-amber-600 shrink-0 mt-0.5" />
      <div className="text-sm">
        <p className="font-medium text-slate-900">Simulated step — no real data is sent</p>
        <p className="text-slate-600 mt-0.5">
          Nothing here contacts a government system, SMS gateway, or payment provider.
        </p>
        {children && <div className="text-slate-700 mt-1.5">{children}</div>}
      </div>
    </div>
  )
}
