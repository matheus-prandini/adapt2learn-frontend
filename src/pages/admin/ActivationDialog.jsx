import React, { useEffect, useRef, useState } from 'react'
import { LuCalendarClock, LuTriangleAlert } from 'react-icons/lu'
import { Alert, Button, Field, Switch } from '../../components/ui'
import { STUDY_ERROR } from '../../api/studyApi'
import { matchesConfirmation } from './confirmationPhrase'

/**
 * Diálogo de ativação/desativação da adaptação de uma onda.
 *
 * Não é o `ConfirmDialog` comum, e não deveria ser: aqui a confirmação é
 * **digitada**, não um clique. Ligar a adaptação cedo ou tarde corrompe o
 * desenho do estudo, e desligar por engano custa sessões de intervenção que não
 * se recuperam — um botão "Confirmar" a um clique de distância é fácil demais.
 *
 * O que o diálogo mostra antes de aceitar a frase vem do **dry-run da própria
 * API** (`preview`), não de uma contagem feita aqui: quantos participantes
 * mudam, quantos já estão no estado pedido, e a data planejada da onda. Contar
 * no frontend criaria uma segunda versão da verdade, que divergiria em silêncio
 * da que a API vai aplicar.
 *
 * Fora do calendário o backend recusa com 409 e esta tela pede o reconhecimento
 * explícito. O interruptor NÃO vem ligado: reconhecer tem de ser um ato.
 */
export default function ActivationDialog({
  open,
  action, // 'activate' | 'deactivate'
  onda,
  domain,
  preview, // resposta do dry-run
  busy = false,
  error = null, // { status, detail } da última tentativa
  onConfirm, // (confirmation, acknowledgeOffCalendar) => void
  onCancel,
}) {
  const [frase, setFrase] = useState('')
  const [reconhece, setReconhece] = useState(false)
  const inputRef = useRef(null)

  const ativando = action === 'activate'
  const esperada = preview?.expected_confirmation || ''

  useEffect(() => {
    if (open) {
      setFrase('')
      setReconhece(false)
      // Foco no campo, não no botão: o próximo ato é digitar.
      const t = setTimeout(() => inputRef.current?.focus(), 30)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open, action, onda, domain])

  useEffect(() => {
    if (!open) return undefined
    const onKey = e => {
      if (e.key === 'Escape' && !busy) onCancel?.()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  if (!open) return null

  const fraseConfere = matchesConfirmation(frase, esperada)

  const foraDoCalendario = preview?.off_calendar || error?.detail?.planned_date !== undefined
  const precisaReconhecer = foraDoCalendario && !reconhece
  const dominioDeControle = Array.isArray(error?.detail?.offending_uids)

  const nada = preview && preview.n_to_change === 0

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
        aria-labelledby="a2l-ativacao-titulo"
      >
        <h2 id="a2l-ativacao-titulo" style={{ fontSize: 'var(--a2l-text-lg)' }}>
          {ativando ? 'Ativar' : 'Desativar'} adaptação — onda {onda}, {domain}
        </h2>

        {preview && (
          <div className="a2l-stack" style={{ gap: 10, marginTop: 14 }}>
            <p style={{ color: 'var(--a2l-ink-500)', lineHeight: 1.55 }}>
              {nada ? (
                <>
                  Nenhum participante muda de estado: os <strong>{preview.n_already}</strong> em
                  escopo já estão {ativando ? 'com a adaptação ligada' : 'no controle'}.
                </>
              ) : (
                <>
                  Esta ação afeta <strong>{preview.n_to_change}</strong> participante
                  {preview.n_to_change === 1 ? '' : 's'} da onda {onda} cujo domínio tratado é{' '}
                  <strong>{domain}</strong>
                  {preview.n_already > 0 && (
                    <>
                      {' '}
                      ({preview.n_already} já {ativando ? 'ativos' : 'no controle'}, não
                      {ativando ? ' serão recarimbados' : ' serão tocados'})
                    </>
                  )}
                  .
                </>
              )}
            </p>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: 'var(--a2l-ink-500)',
                fontSize: 'var(--a2l-text-sm)',
              }}
            >
              <LuCalendarClock size={15} aria-hidden="true" />
              Data efetiva <strong>{preview.effective_date}</strong>
              {preview.planned_date && (
                <>
                  {' · '}planejada da onda <strong>{preview.planned_date}</strong>
                </>
              )}
            </div>
          </div>
        )}

        {foraDoCalendario && (
          <Alert tone="warning" style={{ marginTop: 14 }}>
            <strong>Fora do calendário.</strong> A data efetiva não é a data planejada da onda{' '}
            {onda}
            {preview?.planned_date ? ` (${preview.planned_date})` : ''}. Ligar cedo ou tarde
            corrompe o desenho do estudo — se for intencional, reconheça abaixo. O motivo fica na
            trilha de auditoria.
          </Alert>
        )}

        {dominioDeControle && (
          <Alert tone="error" style={{ marginTop: 14 }}>
            <strong>Domínio de controle.</strong> {error.detail.offending_uids.length}{' '}
            participante(s) têm <code>{domain}</code> como domínio de <em>controle</em>, não como
            domínio tratado. Ativar ali destruiria a série de controle interna deles. A API recusou.
          </Alert>
        )}

        {error && !dominioDeControle && error.status !== STUDY_ERROR.NEEDS_CONFIRMATION && (
          <Alert tone="error" style={{ marginTop: 14 }}>
            {error.message}
          </Alert>
        )}

        {foraDoCalendario && (
          <div style={{ marginTop: 14 }}>
            <Switch
              checked={reconhece}
              onChange={e => setReconhece(e.target.checked)}
              label="Reconheço que a data difere da planejada"
              hint="Fica registrado na trilha junto com a ativação."
            />
          </div>
        )}

        <Field
          label="Para confirmar, digite a frase abaixo"
          hint={
            <>
              Digite exatamente: <code>{esperada}</code>
            </>
          }
          style={{ marginTop: 16 }}
        >
          <input
            ref={inputRef}
            value={frase}
            onChange={e => setFrase(e.target.value)}
            placeholder={esperada}
            autoComplete="off"
            spellCheck={false}
            aria-label={`Digite ${esperada} para confirmar`}
          />
        </Field>

        {error?.status === STUDY_ERROR.NEEDS_CONFIRMATION && (
          <p className="a2l-hint a2l-hint--error" style={{ marginTop: -4 }}>
            A frase não confere. {error.message}
          </p>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22 }}>
          <Button variant="secondary" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button
            variant={ativando ? 'primary' : 'danger'}
            onClick={() => onConfirm?.(frase, reconhece)}
            loading={busy}
            disabled={!fraseConfere || precisaReconhecer || !preview}
            icon={!ativando ? <LuTriangleAlert size={16} /> : null}
          >
            {ativando ? `Ativar onda ${onda}` : `Desativar onda ${onda}`}
          </Button>
        </div>
      </div>
    </div>
  )
}
