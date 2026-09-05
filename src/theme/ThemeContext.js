import React, {
  createContext, useCallback, useContext, useEffect, useMemo, useState,
} from 'react'

export const THEME_STORAGE_KEY = 'a2l-theme'

/** 'light' e 'dark' são escolhas explícitas; 'system' acompanha o SO. */
export const THEME_PREFERENCES = ['light', 'dark', 'system']

const DARK_QUERY = '(prefers-color-scheme: dark)'

const ThemeContext = createContext(null)

function readStoredPreference() {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return THEME_PREFERENCES.includes(stored) ? stored : 'system'
  } catch {
    // Modo privativo / cookies bloqueados: cai no padrão do sistema.
    return 'system'
  }
}

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia(DARK_QUERY).matches
}

export function ThemeProvider({ children }) {
  const [preference, setPreferenceState] = useState(readStoredPreference)
  const [systemDark, setSystemDark] = useState(systemPrefersDark)

  // Com 'system', o tema precisa seguir o SO mesmo depois de a página abrir.
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined
    const mq = window.matchMedia(DARK_QUERY)
    const onChange = e => setSystemDark(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference

  // O CSS lê sempre data-theme resolvido — nunca 'system'.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0B0F1E' : '#6C5CE7')
  }, [theme])

  const setPreference = useCallback(next => {
    setPreferenceState(next)
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      // Sem persistência a escolha vale só para esta sessão — não é erro fatal.
    }
  }, [])

  // Alterna direto entre claro e escuro, partindo do que está na tela.
  const toggle = useCallback(() => {
    setPreference(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setPreference])

  const value = useMemo(
    () => ({ theme, preference, setPreference, toggle, isDark: theme === 'dark' }),
    [theme, preference, setPreference, toggle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme precisa estar dentro de <ThemeProvider>')
  return ctx
}
