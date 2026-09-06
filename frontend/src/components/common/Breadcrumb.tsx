import { Link } from 'react-router-dom'

export interface Crumb {
  label: string
  to?: string
}

/** Slash-separated breadcrumb — the primary "where am I" cue across the product. */
export function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="crumbs">
      {items.map((c, i) => {
        const last = i === items.length - 1
        return (
          <span key={i} className="flex items-center gap-1.5">
            {c.to && !last ? (
              <Link to={c.to} className="hover:text-slate-600 transition-colors">{c.label}</Link>
            ) : (
              <span className={last ? 'text-slate-600' : ''}>{c.label}</span>
            )}
            {!last && <span className="text-slate-300">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
