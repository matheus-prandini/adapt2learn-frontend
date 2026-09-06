import React from 'react'

export default function EmptyState({ icon, title, description, action, tone = 'neutral' }) {
  return (
    <div className="a2l-empty">
      {icon && (
        <span
          className={`a2l-icon-chip a2l-icon-chip--lg a2l-icon-chip--${tone}`}
          style={{ marginBottom: 6 }}
        >
          {icon}
        </span>
      )}
      {title && <p className="a2l-empty__title">{title}</p>}
      {description && <p className="a2l-empty__text">{description}</p>}
      {action && <div style={{ marginTop: 10 }}>{action}</div>}
    </div>
  )
}
