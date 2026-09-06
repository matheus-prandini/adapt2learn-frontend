import React from 'react'

export default function Switch({ checked, onChange, label, hint, ...rest }) {
  return (
    <label className="a2l-switch">
      <input type="checkbox" checked={checked} onChange={onChange} {...rest} />
      <span className="a2l-switch__track"><span className="a2l-switch__thumb" /></span>
      {(label || hint) && (
        <span>
          {label && <span style={{ fontWeight: 700, fontFamily: 'var(--a2l-font-display)' }}>{label}</span>}
          {hint && <span className="a2l-hint" style={{ display: 'block' }}>{hint}</span>}
        </span>
      )}
    </label>
  )
}
