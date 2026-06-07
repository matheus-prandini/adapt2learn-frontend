// src/pages/GameSelect.js
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStorage, ref, getDownloadURL } from 'firebase/storage'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'
import { listWordChallengesForSchool } from '../api/wordChallengesApi'
import { buildContentCatalog, getGameId } from '../utils/contentOptions'

export default function GameSelect() {
  const [profile, setProfile] = useState(null)
  const [docsList, setDocsList] = useState([])
  const [gamesList, setGamesList] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [wordChallengesList, setWordChallengesList] = useState([])
  const [optionsError, setOptionsError] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const storage = getStorage()

  const selectedGameId = selectedGame ? getGameId(selectedGame) : ''

  useEffect(() => {
    ;(async () => {
      try {
        const meRes = await apiFetch('/me')
        const pr = await parseJsonOrThrow(meRes, 'Falha ao carregar perfil')
        setProfile(pr)

        const docsRes = await apiFetch(`/documents/school/${pr.school_id}`)
        const docs = await parseJsonOrThrow(docsRes, 'Falha ao carregar documentos')
        setDocsList(docs)

        try {
          const wordItems = await listWordChallengesForSchool(pr.school_id)
          setWordChallengesList(wordItems)
        } catch (wordErr) {
          console.error(wordErr)
          setOptionsError('Não foi possível carregar opções de desafios de palavras.')
        }

        const gamesRes = await apiFetch('/games')
        const games = await parseJsonOrThrow(gamesRes, 'Falha ao carregar jogos')

        const withIcons = await Promise.all(
          games.map(async g => {
            let iconUrl = ''
            if (g.icon_url) {
              iconUrl = await getDownloadURL(ref(storage, g.icon_url))
            }
            return { ...g, iconUrl }
          })
        )
        setGamesList(withIcons)
      } catch (err) {
        console.error(err)
        setError(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const contentCatalog = useMemo(
    () => buildContentCatalog(docsList, wordChallengesList),
    [docsList, wordChallengesList]
  )

  const disciplineOptions = contentCatalog.disciplines
  const subareaOptions = useMemo(
    () => contentCatalog.getSubareas(discipline),
    [contentCatalog, discipline]
  )

  if (loading) return <p style={styles.loading}>🔄 Carregando…</p>
  if (error) return <p style={styles.error}>{error}</p>

  async function createSession(gameId) {
    const res = await apiFetch('/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ game_id: gameId, discipline, subarea }),
    })
    if (!res.ok) {
      throw new Error(`Não foi possível criar sessão (status ${res.status})`)
    }
    const { session_number } = await res.json()
    return session_number
  }

  const onStart = async () => {
    setLoadingSession(true)
    try {
      const sessionNumber = await createSession(selectedGameId)

      await apiFetch('/events/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_start',
          game_id: selectedGameId,
          payload: {
            discipline,
            subarea,
            session_number: sessionNumber,
          },
        }),
      })

      const useWarmup = selectedGame.has_warmup && profile.group !== 'grupo3'
      const params = new URLSearchParams({
        user_id: profile.uid,
        school_id: profile.school_id,
        discipline,
        subarea,
        session_number: sessionNumber,
        game_id: selectedGameId,
        game_path: selectedGame.path,
      }).toString()

      if (useWarmup) {
        navigate(`/warmup?${params}`)
      } else {
        window.location.href = `/${selectedGame.path}/?${params}`
      }
    } catch (err) {
      console.error(err)
      alert('Erro ao iniciar sessão: ' + err.message)
    } finally {
      setLoadingSession(false)
    }
  }

  const onGameSelect = g => {
    setSelectedGame(g)
    setDiscipline('')
    setSubarea('')
    setOptionsError('')
  }

  const handleDisciplineChange = value => {
    setDiscipline(value)
    setSubarea('')
  }

  return (
    <div style={styles.container}>
      <button type="button" onClick={() => navigate(-1)} style={styles.back}>
        ← Voltar
      </button>

      {!selectedGame ? (
        <>
          <h2 style={styles.header}>🕹️ Escolha um Jogo</h2>
          <div style={styles.grid}>
            {gamesList.map(game => (
              <div
                key={getGameId(game)}
                onClick={() => onGameSelect(game)}
                style={styles.card}
              >
                {game.iconUrl ? (
                  <img src={game.iconUrl} alt={game.name} style={styles.icon} />
                ) : (
                  <div style={styles.placeholder} />
                )}
                <div style={styles.gameName}>{game.name}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setSelectedGame(null)}
            style={styles.back}
          >
            ← Trocar Jogo
          </button>
          <h2 style={styles.header}>🎯 {selectedGame.name}</h2>

          {selectedGame.has_options && (
            <div style={styles.options}>
              {loading && (
                <p style={styles.optionsHint}>
                  Carregando disciplinas e subáreas (documentos + desafios de palavras)…
                </p>
              )}
              {optionsError && (
                <p style={styles.optionsWarn}>{optionsError}</p>
              )}

              <div style={styles.fieldRow}>
                <div style={styles.field}>
                  <label>Disciplina *</label>
                  <select
                    value={discipline}
                    onChange={e => handleDisciplineChange(e.target.value)}
                    disabled={loading}
                    style={{
                      ...styles.select,
                      borderColor: discipline ? '#ccc' : 'red',
                    }}
                    required
                  >
                    <option value="">Selecione...</option>
                    {disciplineOptions.map(d => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={styles.field}>
                  <label>Subárea *</label>
                  <select
                    value={subarea}
                    onChange={e => setSubarea(e.target.value)}
                    disabled={!discipline || loading}
                    style={{
                      ...styles.select,
                      borderColor: subarea ? '#ccc' : 'red',
                      backgroundColor: discipline ? '#fff' : '#f5f5f5',
                    }}
                    required
                  >
                    <option value="">
                      {discipline
                        ? subareaOptions.length > 0
                          ? 'Selecione...'
                          : 'Nenhuma subárea cadastrada'
                        : 'Escolha a disciplina primeiro'}
                    </option>
                    {subareaOptions.map(s => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {!loading && disciplineOptions.length === 0 && (
                <p style={styles.optionsWarn}>
                  Nenhum conteúdo cadastrado para esta escola. Peça ao professor para
                  enviar documentos ou criar desafios de palavras.
                </p>
              )}
              {!loading &&
                discipline &&
                subareaOptions.length === 0 && (
                  <p style={styles.optionsWarn}>
                    Não há subáreas cadastradas para &quot;{discipline}&quot;.
                  </p>
                )}
            </div>
          )}

          <button
            type="button"
            onClick={onStart}
            disabled={
              loadingSession ||
              loading ||
              (selectedGame.has_options && (!discipline || !subarea))
            }
            style={{
              ...styles.start,
              opacity:
                selectedGame.has_options && (!discipline || !subarea) ? 0.6 : 1,
              cursor:
                selectedGame.has_options && (!discipline || !subarea)
                  ? 'not-allowed'
                  : 'pointer',
            }}
          >
            ▶️ Iniciar Jogo
          </button>
        </>
      )}
    </div>
  )
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 600,
    margin: '40px auto',
    background: '#fffde7',
    borderRadius: 12,
  },
  back: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    marginBottom: 20,
  },
  header: { textAlign: 'center', color: '#f57f17', marginBottom: 20 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))',
    gap: 16,
  },
  card: {
    cursor: 'pointer',
    background: '#fff',
    border: '2px solid #ffe082',
    borderRadius: 12,
    padding: 12,
    textAlign: 'center',
  },
  icon: { width: 80, height: 80, marginBottom: 8 },
  placeholder: { height: 80, marginBottom: 8, background: '#eee' },
  gameName: { fontSize: 14, fontWeight: 'bold', color: '#33691e' },
  options: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
    marginBottom: 24,
  },
  optionsHint: { fontSize: 13, color: '#666', margin: 0 },
  optionsWarn: { fontSize: 13, color: '#e65100', margin: 0 },
  fieldRow: { display: 'flex', gap: 24, flexWrap: 'wrap' },
  field: { display: 'flex', flexDirection: 'column', flex: 1, gap: 6, minWidth: 200 },
  select: { padding: 8, borderRadius: 6, border: '1px solid #ccc' },
  start: {
    width: '100%',
    padding: 12,
    fontSize: 16,
    background: '#66bb6a',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
  },
  loading: { padding: 20, textAlign: 'center' },
  error: { padding: 20, textAlign: 'center', color: 'red' },
}
