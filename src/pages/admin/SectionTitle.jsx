import React from 'react'

/** Título de seção do painel, com slot para uma ação à direita. */
export default function SectionTitle({ children, action, style }) {
  return (
    <div
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: 12, marginBottom: 14, flexWrap: 'wrap', ...style,
      }}
    >
      <h3 style={{ fontSize: 'var(--a2l-text-lg)' }}>{children}</h3>
      {action}
    </div>
  )
}
