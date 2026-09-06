import React from 'react'
import { useNavigate } from 'react-router-dom'
import { LuArrowLeft } from 'react-icons/lu'
import Logo from './Logo'
import ThemeToggle from './ThemeToggle'

/** Iniciais para o avatar do topo — evita depender de foto de perfil. */
function initials(name) {
  if (!name) return '?'
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

export function UserChip({ name, role }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          borderRadius: '50%',
          display: 'grid',
          placeItems: 'center',
          fontFamily: 'var(--a2l-font-display)',
          fontWeight: 800,
          fontSize: 13,
          color: '#fff',
          background: 'linear-gradient(135deg, var(--a2l-mint-500), var(--a2l-brand-500))',
          flex: 'none',
        }}
      >
        {initials(name)}
      </span>
      <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
        <span
          style={{
            fontFamily: 'var(--a2l-font-display)',
            fontWeight: 700,
            fontSize: 'var(--a2l-text-sm)',
          }}
        >
          {name || 'Aluno(a)'}
        </span>
        {role && (
          <span style={{ fontSize: 'var(--a2l-text-xs)', color: 'var(--a2l-ink-500)' }}>
            {role}
          </span>
        )}
      </span>
    </span>
  )
}

/**
 * Casca padrão das páginas: barra superior fixa com marca + ações e um
 * container com largura máxima. `width` controla a medida do conteúdo.
 */
export default function AppShell({
  width = 'lg',
  back = null, // string (rota), -1, ou { to, label }
  backLabel = 'Voltar',
  actions = null,
  topbar = true,
  children,
}) {
  const navigate = useNavigate()
  const backTo = back && typeof back === 'object' ? back.to : back
  const label = (back && typeof back === 'object' && back.label) || backLabel

  return (
    <div className="a2l-shell">
      {topbar && (
        <header className="a2l-topbar">
          {back != null ? (
            <button
              type="button"
              className="a2l-btn a2l-btn--ghost a2l-btn--sm"
              onClick={() => (backTo === -1 ? navigate(-1) : navigate(backTo))}
            >
              <LuArrowLeft size={16} aria-hidden="true" />
              {label}
            </button>
          ) : (
            <Logo />
          )}
          <span className="a2l-topbar__spacer" />
          {actions}
          <ThemeToggle />
        </header>
      )}
      <main className={`a2l-container a2l-container--${width}`}>{children}</main>
    </div>
  )
}

/** Layout centrado para login/cadastro. */
export function AuthShell({ children }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px 20px',
        gap: 24,
      }}
    >
      <div className="a2l-theme-float">
        <ThemeToggle />
      </div>

      <div className="a2l-anim-in" style={{ textAlign: 'center' }}>
        <Logo size={46} iconSize={25} showText={false} />
        <h1 style={{ fontSize: 'var(--a2l-text-2xl)', marginTop: 14 }}>
          Adapt
          <span
            style={{
              background: 'linear-gradient(120deg, var(--a2l-brand-600), var(--a2l-mint-600))',
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }}
          >
            2
          </span>
          Learn
        </h1>
        <p style={{ color: 'var(--a2l-ink-500)', marginTop: 6, fontSize: 'var(--a2l-text-base)' }}>
          Aprender jogando, no seu ritmo.
        </p>
      </div>
      <div className="a2l-anim-in a2l-delay-1" style={{ width: '100%', maxWidth: 440 }}>
        {children}
      </div>
    </div>
  )
}
