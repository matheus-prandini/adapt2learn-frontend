import React, { useEffect } from 'react'
import Button from './Button'

/**
 * Confirmação modal no lugar de window.confirm: respeita o tema, fecha com
 * Esc ou clique fora, e mostra estado de "em andamento" no botão.
 */
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  tone = 'primary',       // 'primary' | 'danger'
  busy = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (!open) return undefined
    const onKey = e => {
      if (e.key === 'Escape' && !busy) onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  return (
    <div
      className="a2l-overlay"
      role="presentation"
      onMouseDown={e => {
        if (e.target === e.currentTarget && !busy) onCancel?.()
      }}
    >
      <div
        className="a2l-modal"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="a2l-confirm-title"
        aria-describedby={message ? 'a2l-confirm-message' : undefined}
      >
        <h2 id="a2l-confirm-title" style={{ fontSize: 'var(--a2l-text-lg)' }}>{title}</h2>
        {message && (
          <p id="a2l-confirm-message" style={{ color: 'var(--a2l-ink-500)', marginTop: 8, lineHeight: 1.55 }}>
            {message}
          </p>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>{cancelLabel}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} onClick={onConfirm} loading={busy} autoFocus>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
