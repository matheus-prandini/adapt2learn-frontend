import React from 'react'

/** Abas de navegação. `items`: [{ id, label, icon }] */
export function Tabs({ items, value, onChange, className = '' }) {
  return (
    <nav className={`a2l-tabs ${className}`} role="tablist">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`a2l-tab ${value === item.id ? 'a2l-tab--active' : ''}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </nav>
  )
}

/** Alternador compacto para 2–3 opções mutuamente exclusivas. */
export function SegmentedControl({ items, value, onChange, className = '', style }) {
  return (
    <div className={`a2l-segmented ${className}`} style={style} role="tablist">
      {items.map(item => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={value === item.id}
          onClick={() => onChange(item.id)}
          className={`a2l-segmented__item ${value === item.id ? 'a2l-segmented__item--active' : ''}`}
        >
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}

export default Tabs
