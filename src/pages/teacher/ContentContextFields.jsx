import React from 'react'
import { LuSlidersHorizontal, LuPlus } from 'react-icons/lu'
import { Card, Field, Button } from '../../components/ui'

const NEW_SUBAREA_VALUE = '__new_subarea__'

/**
 * Jogo + disciplina + subárea (opções de documentos + word-challenges do jogo).
 */
export default function ContentContextFields({
  games,
  gameId,
  onGameChange,
  discipline,
  onDisciplineChange,
  subarea,
  onSubareaChange,
  subareaIsCustom,
  onSubareaCustomModeChange,
  disciplineOptions,
  subareaOptions,
  loadingOptions,
}) {
  const showSubareaSelect = discipline && subareaOptions.length > 0 && !subareaIsCustom

  const subareaSelectValue = subarea && subareaOptions.includes(subarea) ? subarea : ''

  return (
    <Card as="section" quiet style={{ marginBottom: 20, padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <LuSlidersHorizontal size={15} style={{ color: 'var(--a2l-brand-600)' }} />
        <span className="a2l-eyebrow-sm">Contexto do conteúdo</span>
      </div>

      <div
        style={{
          display: 'grid',
          gap: 16,
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
        }}
      >
        <Field label="Jogo vinculado">
          <select value={gameId} onChange={e => onGameChange(e.target.value)}>
            <option value="">Selecione um jogo…</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Disciplina">
          <select
            value={discipline}
            onChange={e => onDisciplineChange(e.target.value)}
            disabled={loadingOptions}
          >
            <option value="">Selecione…</option>
            {disciplineOptions.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <div className="a2l-field">
          <Field label="Subárea">
            {showSubareaSelect ? (
              <select
                value={subareaSelectValue}
                onChange={e => {
                  if (e.target.value === NEW_SUBAREA_VALUE) {
                    onSubareaCustomModeChange(true)
                    onSubareaChange('')
                  } else {
                    onSubareaChange(e.target.value)
                  }
                }}
                disabled={loadingOptions}
              >
                <option value="">Selecione…</option>
                {subareaOptions.map(s => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
                <option value={NEW_SUBAREA_VALUE}>+ Nova subárea…</option>
              </select>
            ) : (
              <input
                type="text"
                placeholder={
                  subareaOptions.length > 0 && discipline
                    ? 'Nova subárea ou escolha acima'
                    : 'Ex: Vocabulário ou Geometria'
                }
                value={subarea}
                onChange={e => onSubareaChange(e.target.value)}
                disabled={!discipline || loadingOptions}
              />
            )}
          </Field>
          {subareaIsCustom && subareaOptions.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              icon={<LuPlus size={13} />}
              style={{ alignSelf: 'flex-start', marginTop: 2 }}
              onClick={() => {
                onSubareaCustomModeChange(false)
                onSubareaChange('')
              }}
            >
              Voltar às subáreas existentes
            </Button>
          )}
        </div>
      </div>

      <p className="a2l-hint" style={{ marginTop: 14 }}>
        {loadingOptions
          ? 'Carregando disciplinas e subáreas…'
          : 'As opções vêm dos documentos da escola e dos desafios de palavras já cadastrados.'}
      </p>
    </Card>
  )
}
