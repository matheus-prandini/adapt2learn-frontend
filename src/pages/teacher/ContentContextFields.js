import React from 'react'

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
  const showSubareaSelect =
    discipline && subareaOptions.length > 0 && !subareaIsCustom

  const subareaSelectValue =
    subarea && subareaOptions.includes(subarea) ? subarea : ''

  return (
    <section style={styles.wrap}>
      <label style={styles.label}>
        Jogo vinculado
        <select
          value={gameId}
          onChange={e => onGameChange(e.target.value)}
          style={styles.input}
        >
          <option value="">Selecione um jogo…</option>
          {games.map(g => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </label>

      <div style={styles.row}>
        <label style={styles.label}>
          Disciplina
          <select
            value={discipline}
            onChange={e => onDisciplineChange(e.target.value)}
            disabled={loadingOptions}
            style={styles.input}
          >
            <option value="">Selecione…</option>
            {disciplineOptions.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>

        <label style={styles.label}>
          Subárea
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
              style={styles.input}
            >
              <option value="">Selecione…</option>
              {subareaOptions.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value={NEW_SUBAREA_VALUE}>➕ Nova subárea…</option>
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
              style={styles.input}
            />
          )}
          {subareaIsCustom && subareaOptions.length > 0 && (
            <button
              type="button"
              onClick={() => {
                onSubareaCustomModeChange(false)
                onSubareaChange('')
              }}
              style={styles.linkBtn}
            >
              ← Voltar às subáreas existentes
            </button>
          )}
        </label>
      </div>

      {loadingOptions && (
        <p style={styles.hint}>Carregando disciplinas e subáreas…</p>
      )}
      <p style={styles.hint}>
        Opções dos documentos da escola e dos desafios de palavras.
      </p>
    </section>
  )
}

const styles = {
  wrap: {
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontWeight: 'bold',
    fontSize: 14,
    flex: '1 1 200px',
  },
  input: {
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 15,
    maxWidth: '100%',
  },
  hint: { fontSize: 13, color: '#777', marginTop: 10, marginBottom: 0 },
  linkBtn: {
    marginTop: 6,
    padding: 0,
    border: 'none',
    background: 'none',
    color: '#3949ab',
    fontSize: 12,
    cursor: 'pointer',
    textAlign: 'left',
  },
}
