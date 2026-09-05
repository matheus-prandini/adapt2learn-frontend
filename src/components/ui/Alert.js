import React from 'react'
import { LuCircleAlert, LuCircleCheck, LuInfo, LuTriangleAlert } from 'react-icons/lu'

const ICONS = {
  error: LuCircleAlert,
  success: LuCircleCheck,
  warning: LuTriangleAlert,
  info: LuInfo,
}

export default function Alert({ tone = 'info', children, className = '', ...rest }) {
  const Icon = ICONS[tone] || LuInfo
  return (
    <div className={`a2l-alert a2l-alert--${tone} ${className}`} role={tone === 'error' ? 'alert' : 'status'} {...rest}>
      <Icon className="a2l-alert__icon" size={18} aria-hidden="true" />
      <div>{children}</div>
    </div>
  )
}
