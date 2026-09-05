import React from 'react'

export default function Badge({ tone = 'brand', icon, children, className = '', ...rest }) {
  return (
    <span className={`a2l-badge a2l-badge--${tone} ${className}`} {...rest}>
      {icon}
      {children}
    </span>
  )
}
