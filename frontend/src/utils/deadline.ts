/**
 * Deadline arithmetic for RTI Response Protection.
 * Pure functions — no side effects, no state access.
 */

/** Return the effective "now" string, using demo time travel if set. */
export function getDemoNow(demoNow: string | null | undefined): string {
  return demoNow ?? new Date().toISOString()
}

/** Add N calendar days to an ISO date string and return new ISO string. */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString()
}

/**
 * Days remaining until due date (relative to nowIso).
 * Positive  = days left.
 * 0         = due today.
 * Negative  = overdue (use daysOverdue for the magnitude).
 */
export function daysRemaining(dueDateIso: string, nowIso: string): number {
  const due = startOfDay(new Date(dueDateIso))
  const now = startOfDay(new Date(nowIso))
  const diffMs = due.getTime() - now.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function isOverdue(dueDateIso: string, nowIso: string): boolean {
  return daysRemaining(dueDateIso, nowIso) < 0
}

export function isDueToday(dueDateIso: string, nowIso: string): boolean {
  return daysRemaining(dueDateIso, nowIso) === 0
}

/** How many days past the deadline (0 if not yet overdue). */
export function daysOverdue(dueDateIso: string, nowIso: string): number {
  const rem = daysRemaining(dueDateIso, nowIso)
  return rem < 0 ? -rem : 0
}

/** e.g. "6 September 2026" */
export function formatFriendlyDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/** e.g. "6 Sep 2026" */
export function formatShortDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}
