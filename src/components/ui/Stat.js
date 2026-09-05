import React from 'react'

const TONE_VAR = {
  brand: 'var(--a2l-brand-600)',
  mint: 'var(--a2l-mint-600)',
  sun: 'var(--a2l-sun-600)',
  success: 'var(--a2l-success)',
  danger: 'var(--a2l-danger)',
  neutral: 'var(--a2l-ink-500)',
}

export default function Stat({ icon, label, value, foot, tone = 'brand', className = '' }) {
  return (
    <div className={`a2l-stat ${className}`}>
      <span className="a2l-stat__label">
        {icon && <span style={{ color: TONE_VAR[tone] || TONE_VAR.brand }}>{icon}</span>}
        {label}
      </span>
      <div className="a2l-stat__value">{value}</div>
      {foot && <div className="a2l-stat__foot">{foot}</div>}
    </div>
  )
}

export function Progress({ value = 0, label }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--a2l-text-xs)', color: 'var(--a2l-ink-500)', marginBottom: 6, fontWeight: 600 }}>
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="a2l-progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <div className="a2l-progress__bar" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}
