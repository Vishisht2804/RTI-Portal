/**
 * Light/dark theme handling.
 *
 * The theme is a `.dark` class on <html>. Choice is persisted in localStorage
 * under `rti_theme`; with no stored choice we follow the OS preference.
 */
export type Theme = 'light' | 'dark'

const STORAGE_KEY = 'rti_theme'

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

export function getStoredTheme(): Theme | null {
  try {
    const v = localStorage.getItem(STORAGE_KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function getTheme(): Theme {
  return getStoredTheme() ?? (systemPrefersDark() ? 'dark' : 'light')
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
}

export function setTheme(theme: Theme): void {
  applyTheme(theme)
  try {
    localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    /* storage unavailable — still applied for this session */
  }
  window.dispatchEvent(new CustomEvent('rti-theme-change', { detail: theme }))
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === 'dark' ? 'light' : 'dark'
  setTheme(next)
  return next
}

/** Call once before React renders so there is no flash of the wrong theme. */
export function initTheme(): void {
  applyTheme(getTheme())
}
