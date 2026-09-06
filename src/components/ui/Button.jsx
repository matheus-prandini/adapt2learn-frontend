import React from 'react'

const VARIANTS = {
  primary: 'a2l-btn--primary',
  accent: 'a2l-btn--accent',
  sun: 'a2l-btn--sun',
  danger: 'a2l-btn--danger',
  secondary: 'a2l-btn--secondary',
  ghost: 'a2l-btn--ghost',
  soft: 'a2l-btn--soft',
}

const SIZES = { sm: 'a2l-btn--sm', md: '', lg: 'a2l-btn--lg' }

export default function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  loading = false,
  icon = null,
  iconRight = null,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const cls = [
    'a2l-btn',
    VARIANTS[variant] || VARIANTS.primary,
    SIZES[size] || '',
    block ? 'a2l-btn--block' : '',
    !children ? 'a2l-btn--icon' : '',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button className={cls} disabled={disabled || loading} {...rest}>
      {loading ? <span className="a2l-btn__spinner" aria-hidden="true" /> : icon}
      {children}
      {!loading && iconRight}
    </button>
  )
}
