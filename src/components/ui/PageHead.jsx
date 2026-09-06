import React from 'react'

export default function PageHead({ eyebrow, title, subtitle, hero = false, action, className = '' }) {
  return (
    <div className={`a2l-page-head ${className}`} style={action ? { display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap' } : undefined}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {eyebrow && <div className="a2l-page-head__eyebrow">{eyebrow}</div>}
        <h1 className={`a2l-page-head__title ${hero ? 'a2l-page-head__title--hero' : ''}`}>{title}</h1>
        {subtitle && <p className="a2l-page-head__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
