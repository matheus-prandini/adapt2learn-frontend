import React, { useEffect, useRef, useState } from 'react'
import { LuSun, LuMoon, LuMonitor, LuCheck } from 'react-icons/lu'
import { useTheme } from '../../theme/ThemeContext'

const OPTIONS = [
  { id: 'light', label: 'Claro', icon: LuSun },
  { id: 'dark', label: 'Escuro', icon: LuMoon },
  { id: 'system', label: 'Sistema', icon: LuMonitor },
]

/**
 * Botão de tema. Um clique alterna claro/escuro (o que 99% das pessoas quer);
 * o menu abre com Alt+clique, seta para baixo ou clique no chevron, e traz a
 * opção "Sistema".
 */
export default function ThemeToggle({ className = '' }) {
  const { theme, preference, setPreference, toggle } = useTheme()
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = e => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
    }
    const onKeyDown = e => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const active = OPTIONS.find(o => o.id === preference) || OPTIONS[2]
  // O ícone mostra o tema em vigor, não a preferência — com 'system' o usuário
  // precisa ver se está claro ou escuro agora.
  const CurrentIcon = preference === 'system' ? LuMonitor : theme === 'dark' ? LuMoon : LuSun

  return (
    <div ref={wrapRef} className={`a2l-theme-toggle ${className}`}>
      <button
        type="button"
        className="a2l-btn a2l-btn--ghost a2l-btn--sm a2l-btn--icon"
        aria-label={`Tema: ${active.label}. Clique para alternar, Alt+clique para escolher.`}
        title={`Tema: ${active.label}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={e => (e.altKey ? setOpen(v => !v) : toggle())}
        onContextMenu={e => {
          e.preventDefault()
          setOpen(v => !v)
        }}
        onKeyDown={e => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setOpen(true)
          }
        }}
      >
        <CurrentIcon size={17} />
      </button>

      <button
        type="button"
        className="a2l-theme-toggle__more"
        aria-label="Escolher tema"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        <svg width="8" height="8" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="m6 9 6 6 6-6"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <div className="a2l-theme-menu" role="menu">
          {OPTIONS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              role="menuitemradio"
              aria-checked={preference === id}
              className={`a2l-theme-menu__item ${preference === id ? 'a2l-theme-menu__item--active' : ''}`}
              onClick={() => {
                setPreference(id)
                setOpen(false)
              }}
            >
              <Icon size={15} aria-hidden="true" />
              <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
              {preference === id && <LuCheck size={14} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
