import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  listWordChallenges,
  createWordChallenges,
  pollWordChallengesList,
} from '../../api/wordChallengesApi'
import { sortWordChallengesByDateDesc } from '../../api/wordChallengeNormalize'

function parseWordsInput(text) {
  return text
    .split(/[\n,;]+/)
    .map(w => w.trim())
    .filter(Boolean)
    .slice(0, 30)
}

export default function WordChallengesSection({
  schoolId,
  discipline,
  subarea,
}) {
  const [mode, setMode] = useState('manual')
  const [wordsText, setWordsText] = useState('')
  const [count, setCount] = useState(5)
  const [topic, setTopic] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [challenges, setChallenges] = useState([])
  const [loadingList, setLoadingList] = useState(false)
  const [creating, setCreating] = useState(false)
  const [status, setStatus] = useState('')

  const filtersReady = schoolId && discipline && subarea

  const listParams = useMemo(
    () =>
      filtersReady
        ? { school_id: schoolId, discipline, subarea }
        : null,
    [filtersReady, schoolId, discipline, subarea]
  )

  const loadList = useCallback(async () => {
    if (!listParams) return
    setLoadingList(true)
    try {
      const data = await listWordChallenges(listParams)
      setChallenges(sortWordChallengesByDateDesc(data))
    } catch (err) {
      console.error(err)
      setStatus(err.message)
    } finally {
      setLoadingList(false)
    }
  }, [listParams])

  useEffect(() => {
    if (listParams) loadList()
    else setChallenges([])
  }, [listParams, loadList])

  const handleCreate = async e => {
    e.preventDefault()
    if (!listParams) {
      setStatus('Selecione disciplina e subárea.')
      return
    }

    setCreating(true)
    setStatus('Agendando geração dos desafios…')

    try {
      const beforeCount = challenges.length
      let expectedNew = 0
      let body

      if (mode === 'manual') {
        const words = parseWordsInput(wordsText)
        if (words.length === 0) {
          setStatus('Informe entre 1 e 30 palavras.')
          setCreating(false)
          return
        }
        expectedNew = words.length
        body = { ...listParams, words }
      } else {
        const n = Math.min(30, Math.max(1, Number(count) || 1))
        expectedNew = n
        body = {
          ...listParams,
          count: n,
          ...(topic.trim() ? { topic: topic.trim() } : {}),
          ...(gradeLevel.trim() ? { grade_level: gradeLevel.trim() } : {}),
        }
      }

      await createWordChallenges(body)
      setStatus('Gerando desafios… isso pode levar até 2 minutos.')

      const updated = await pollWordChallengesList(listParams, {
        minCount: beforeCount + 1,
        intervalMs: 4000,
        timeoutMs: 150000,
      })

      setChallenges(sortWordChallengesByDateDesc(updated))

      if (updated.length >= beforeCount + expectedNew) {
        setStatus(`${expectedNew} desafio(s) criado(s) com sucesso.`)
        if (mode === 'manual') setWordsText('')
      } else if (updated.length > beforeCount) {
        setStatus('Alguns desafios já estão disponíveis. Atualize a lista em instantes.')
      } else {
        setStatus('Geração em andamento. Atualize a lista em alguns instantes.')
      }
    } catch (err) {
      console.error(err)
      setStatus(err.message || 'Erro ao criar desafios.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div>
      {!filtersReady ? (
        <p style={styles.warn}>
          Selecione disciplina e subárea nos filtros acima para criar ou listar desafios.
        </p>
      ) : (
        <p style={styles.contextNote}>
          Contexto: <strong>{discipline}</strong> / <strong>{subarea}</strong>
        </p>
      )}

      <section style={styles.formSection}>
        <h3 style={styles.heading}>Criar desafios (palavra + imagem)</h3>

        <div style={styles.modeTabs}>
          <button
            type="button"
            onClick={() => setMode('manual')}
            style={{
              ...styles.modeBtn,
              ...(mode === 'manual' ? styles.modeBtnActive : {}),
            }}
          >
            Palavras manuais
          </button>
          <button
            type="button"
            onClick={() => setMode('ai')}
            style={{
              ...styles.modeBtn,
              ...(mode === 'ai' ? styles.modeBtnActive : {}),
            }}
          >
            Gerar com IA
          </button>
        </div>

        <form onSubmit={handleCreate} style={styles.form}>
          {mode === 'manual' ? (
            <label style={styles.label}>
              Palavras (1–30, uma por linha ou separadas por vírgula)
              <textarea
                value={wordsText}
                onChange={e => setWordsText(e.target.value)}
                rows={5}
                placeholder={'gato\ncachorro\npássaro'}
                style={styles.textarea}
                disabled={!filtersReady || creating}
              />
            </label>
          ) : (
            <>
              <label style={styles.label}>
                Quantidade (1–30)
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={count}
                  onChange={e => setCount(e.target.value)}
                  style={styles.input}
                  disabled={!filtersReady || creating}
                />
              </label>
              <label style={styles.label}>
                Tema (opcional)
                <input
                  type="text"
                  placeholder="Ex: animais da fazenda"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  style={styles.input}
                  disabled={!filtersReady || creating}
                />
              </label>
              <label style={styles.label}>
                Série (opcional)
                <input
                  type="text"
                  placeholder="Ex: 3º ano"
                  value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value)}
                  style={styles.input}
                  disabled={!filtersReady || creating}
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={!filtersReady || creating}
            style={{
              ...styles.primaryBtn,
              opacity: !filtersReady || creating ? 0.6 : 1,
            }}
          >
            {creating ? 'Gerando…' : 'Criar desafios'}
          </button>
        </form>
        {!!status && <p style={styles.status}>{status}</p>}
      </section>

      <section>
        <div style={styles.listHeader}>
          <h3 style={styles.heading}>
            Desafios cadastrados ({challenges.length})
          </h3>
          <button
            type="button"
            onClick={loadList}
            disabled={!filtersReady || loadingList}
            style={styles.secondaryBtn}
          >
            Atualizar
          </button>
        </div>

        {!filtersReady ? (
          <p style={styles.muted}>Preencha disciplina e subárea para ver a lista.</p>
        ) : loadingList && challenges.length === 0 ? (
          <p style={styles.muted}>Carregando…</p>
        ) : challenges.length === 0 ? (
          <p style={styles.muted}>Nenhum desafio nesta combinação ainda.</p>
        ) : (
          <div style={styles.grid}>
            {challenges.map((c, index) => (
              <article
                key={c.id || `challenge-${index}-${c.word}`}
                style={styles.card}
              >
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.word || 'Desafio'}
                    style={styles.thumb}
                    loading="lazy"
                  />
                ) : (
                  <div style={styles.thumbPlaceholder}>Sem imagem</div>
                )}
                <div style={styles.cardBody}>
                  <strong style={styles.word}>{c.word || '—'}</strong>
                  {c.created_at ? (
                    <span style={styles.meta}>
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </span>
                  ) : null}
                  {c.pedagogical_badges?.length > 0 ? (
                    <div style={styles.badges}>
                      {c.pedagogical_badges.map(badge => (
                        <span key={badge.key} style={styles.badge}>
                          {badge.text}
                        </span>
                      ))}
                    </div>
                  ) : c.pedagogical_summary ? (
                    <p style={styles.pedagogical}>{c.pedagogical_summary}</p>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  contextNote: { fontSize: 14, color: '#555', marginBottom: 16 },
  formSection: { marginBottom: 32 },
  heading: { color: '#6a1b9a', marginBottom: 8, fontSize: 18 },
  hint: { color: '#666', fontSize: 14, marginBottom: 12 },
  warn: { color: '#e65100', fontSize: 14 },
  row: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    fontWeight: 'bold',
    fontSize: 14,
    flex: '1 1 200px',
  },
  input: { padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 },
  textarea: {
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 15,
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    background: '#f3e5f5',
    padding: 20,
    borderRadius: 12,
  },
  modeTabs: { display: 'flex', gap: 8, marginBottom: 4 },
  modeBtn: {
    flex: 1,
    padding: 10,
    border: '1px solid #ce93d8',
    borderRadius: 8,
    background: '#fff',
    cursor: 'pointer',
    fontSize: 14,
  },
  modeBtnActive: {
    background: '#9c27b0',
    color: '#fff',
    borderColor: '#9c27b0',
  },
  primaryBtn: {
    padding: 12,
    backgroundColor: '#9c27b0',
    color: '#fff',
    fontSize: 16,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  secondaryBtn: {
    padding: '8px 14px',
    background: '#e1bee7',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontSize: 14,
  },
  status: { marginTop: 10, color: '#333', fontSize: 14 },
  muted: { color: '#666' },
  listHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12,
    flexWrap: 'wrap',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
  },
  card: {
    background: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    border: '1px solid #e1bee7',
  },
  thumb: { width: '100%', height: 120, objectFit: 'cover', display: 'block' },
  thumbPlaceholder: {
    height: 120,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#eee',
    color: '#888',
    fontSize: 13,
  },
  cardBody: { padding: 10 },
  word: { fontSize: 16, display: 'block' },
  meta: { fontSize: 11, color: '#888' },
  pedagogical: { fontSize: 12, color: '#555', marginTop: 6, marginBottom: 0 },
  badges: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 8,
  },
  badge: {
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 4,
    background: '#ede7f6',
    color: '#5e35b1',
    fontWeight: 600,
  },
}
