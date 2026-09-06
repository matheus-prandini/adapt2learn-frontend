import React, { useId } from 'react'

export function Label({ children, required, optional, htmlFor }) {
  return (
    <label className="a2l-label" htmlFor={htmlFor}>
      {children}
      {required && <span className="a2l-label__req" aria-hidden="true">*</span>}
      {optional && <span className="a2l-label__opt">(opcional)</span>}
    </label>
  )
}

/** Campo com rótulo, controle e mensagem de apoio/erro. */
export default function Field({
  label,
  hint,
  error,
  required,
  optional,
  children,
  className = '',
  style,
}) {
  const id = useId()
  const control = React.isValidElement(children)
    ? React.cloneElement(children, {
        id: children.props.id || id,
        className: [
          'a2l-input',
          error ? 'a2l-input--invalid' : '',
          children.props.className || '',
        ].filter(Boolean).join(' '),
      })
    : children

  return (
    <div className={`a2l-field ${className}`} style={style}>
      {label && <Label htmlFor={id} required={required} optional={optional}>{label}</Label>}
      {control}
      {error ? (
        <span className="a2l-hint a2l-hint--error">{error}</span>
      ) : hint ? (
        <span className="a2l-hint">{hint}</span>
      ) : null}
    </div>
  )
}
