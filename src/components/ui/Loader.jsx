import React from 'react'

export default function Loader({ label = 'Carregando…', size = 'md' }) {
  return (
    <div className="a2l-loading" role="status" aria-live="polite">
      <span
        className={`a2l-spinner ${size === 'sm' ? 'a2l-spinner--sm' : ''}`}
        aria-hidden="true"
      />
      <span>{label}</span>
    </div>
  )
}
