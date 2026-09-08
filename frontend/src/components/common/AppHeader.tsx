import { Link, useLocation } from 'react-router-dom'
import { ThemeToggle } from './ThemeToggle'

/**
 * Global header — full-width institutional bar. Two-line brand on the left,
 * primary navigation, demo/identity on the right. Thin blue rule above.
 */
export function AppHeader() {
  const { pathname } = useLocation()

  const NAV: { label: string; to: string; match: (p: string) => boolean }[] = [
    { label: 'Home', to: '/', match: (p) => p === '/' },
    { label: 'My RTIs', to: '/filing/dashboard', match: (p) => p.startsWith('/filing') },
    { label: 'How it works', to: '/how-it-works', match: (p) => p === '/how-it-works' },
    { label: 'Help', to: '/help', match: (p) => p === '/help' },
  ]

  return (
    <header className="w-full sticky top-0 z-30">
      <div className="h-1 bg-primary-800" />
      <div className="bg-white border-b border-slate-200">
        <div className="shell-wide h-16 flex items-center gap-8">
          <Link to="/" className="no-underline shrink-0 leading-none">
            <span className="block font-bold text-[18px] text-primary-800 tracking-tight">RTI Navigator</span>
            <span className="block text-[11px] text-slate-400 mt-0.5 tracking-wide">Right to Information</span>
          </Link>

          <nav className="hidden md:flex items-center gap-2 flex-1">
            {NAV.map((item) => {
              const active = item.match(pathname)
              return (
                <Link
                  key={item.label}
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'text-[15px] px-3.5 py-2 rounded-md transition-colors duration-150',
                    active
                      ? 'text-slate-900 font-semibold bg-slate-100'
                      : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              )
            })}
          </nav>

          <div className="flex items-center gap-3 shrink-0 ml-auto md:ml-0">
            <ThemeToggle />
            <span className="hidden sm:inline text-[11px] font-bold tracking-[0.12em] text-primary-700">DEMO</span>
            <span className="hidden lg:inline text-sm text-slate-700">Demo User</span>
          </div>
        </div>

        {/* Compact nav row for small screens */}
        <nav className="md:hidden shell-wide flex items-center gap-1.5 overflow-x-auto border-t border-slate-100 py-2">
          {NAV.map((item) => {
            const active = item.match(pathname)
            return (
              <Link
                key={item.label}
                to={item.to}
                className={[
                  'text-sm px-3 py-1.5 rounded-md whitespace-nowrap transition-colors',
                  active ? 'text-slate-900 font-semibold bg-slate-100' : 'text-slate-500',
                ].join(' ')}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>
    </header>
  )
}
