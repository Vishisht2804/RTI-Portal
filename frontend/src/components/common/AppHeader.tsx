import { Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, PlusCircle, User } from 'lucide-react'
import { ThemeToggle } from './ThemeToggle'

/**
 * Shared application header — used by both Track A and Track B.
 * Replaces the standalone FilingHeader in filing.tsx and the logo block in ProgressSteps.
 */
export function AppHeader() {
  const { pathname } = useLocation()

  function navClass(path: string) {
    const active = pathname === path || (path !== '/' && pathname.startsWith(path))
    return [
      'flex items-center gap-1.5 text-sm font-medium px-3 py-2 rounded-lg transition-colors duration-150',
      active
        ? 'bg-primary-50 text-primary-800'
        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50',
    ].join(' ')
  }

  return (
    <div className="w-full bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
      {/* Indian flag tricolour accent */}
      <div className="tricolour-bar" />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-3 flex items-center justify-between">
        {/* Logo */}
        <Link to="/filing/dashboard" className="flex items-center gap-2 no-underline">
          <div className="w-8 h-8 bg-primary-800 rounded-lg flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">R</span>
          </div>
          <span className="font-bold text-primary-900 text-lg tracking-tight">RTI Navigator</span>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <Link to="/" className={navClass('/__new__')}>
            <PlusCircle size={14} />
            <span className="hidden sm:inline">New RTI</span>
          </Link>
          <Link to="/filing/dashboard" className={navClass('/filing/dashboard')}>
            <LayoutDashboard size={14} />
            <span className="hidden sm:inline">Dashboard</span>
          </Link>
          <Link to="/filing/profile" className={navClass('/filing/profile')}>
            <User size={14} />
            <span className="hidden sm:inline">Profile</span>
          </Link>
        </nav>

        {/* Theme toggle + demo badge */}
        <div className="flex items-center gap-2 ml-2">
          <ThemeToggle />
          <span className="hidden md:inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-slate-400 border border-slate-200 rounded-full px-2.5 py-1">
            Demo Mode
          </span>
        </div>
      </div>
    </div>
  )
}
