import { useEffect, useState } from 'react'
import { Moon, Sun } from 'lucide-react'
import { getTheme, toggleTheme, type Theme } from '../../lib/theme'

/** Small light/dark switch — lives in the shared AppHeader. */
export function ThemeToggle() {
  const [theme, setThemeState] = useState<Theme>('light')

  useEffect(() => {
    setThemeState(getTheme())
    const onChange = (e: Event) => setThemeState((e as CustomEvent<Theme>).detail)
    window.addEventListener('rti-theme-change', onChange)
    return () => window.removeEventListener('rti-theme-change', onChange)
  }, [])

  const isDark = theme === 'dark'

  return (
    <button
      type="button"
      onClick={() => setThemeState(toggleTheme())}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      title={isDark ? 'Light mode' : 'Dark mode'}
      className="flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200
                 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors duration-150
                 focus:outline-none focus:ring-4 focus:ring-slate-100"
    >
      {isDark ? <Sun size={15} /> : <Moon size={15} />}
    </button>
  )
}
