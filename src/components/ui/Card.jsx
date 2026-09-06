import React from 'react'

export default function Card({
  hero = false,
  interactive = false,
  selected = false,
  quiet = false,
  flush = false,
  as: Tag = 'div',
  className = '',
  children,
  ...rest
}) {
  const cls = [
    'a2l-card',
    hero ? 'a2l-card--hero' : '',
    interactive ? 'a2l-card--interactive' : '',
    selected ? 'a2l-card--selected' : '',
    quiet ? 'a2l-card--quiet' : '',
    flush ? 'a2l-card--flush' : '',
    className,
  ].filter(Boolean).join(' ')

  return <Tag className={cls} {...rest}>{children}</Tag>
}

export function CardHeader({ icon, title, subtitle, action, tone = 'brand' }) {
  return (
    <div className="a2l-card__header">
      {icon && <span className={`a2l-icon-chip a2l-icon-chip--${tone}`}>{icon}</span>}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 className="a2l-card__title">{title}</h3>
        {subtitle && <p className="a2l-card__subtitle">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
