// src/pages/GameSelect.js
import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStorage, ref, getDownloadURL } from 'firebase/storage'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'
import { listWordChallengesForGame } from '../api/wordChallengesApi'
import { buildDisciplineOptions, buildSubareaOptions } from '../utils/contentOptions'

export default function GameSelect() {
  const [profile, setProfile] = useState(null)
  const [docsList, setDocsList] = useState([])
  const [gamesList, setGamesList] = useState([])
  const [selectedGame, setSelectedGame] = useState(null)
  const [wordChallengesForGame, setWordChallengesForGame] = useState([])
  const [loadingWordOptions, setLoadingWordOptions] = useState(false)
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea] = useState('')
  const [loading, setLoading] = useState(true)
  const [loadingSession, setLoadingSession] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  const storage = getStorage()

  useEffect(() => {
    ;(async () => {
      try {
        const meRes = await apiFetch('/me')
        const pr = await parseJsonOrThrow(meRes, 'Falha ao carregar perfil')
        setProfile(pr)

        const docsRes = await apiFetch(`/documents/school/${pr.school_id}`)
        const docs = await parseJsonOrThrow(docsRes, 'Falha ao carregar documentos')
        setDocsList(docs)

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

  useEffect(() => {
    if (!selectedGame?.id || !profile?.school_id) {
      setWordChallengesForGame([])
      return
    }

    let cancelled = false
    ;(async () => {
      setLoadingWordOptions(true)
      try {
        const items = await listWordChallengesForGame(
          profile.school_id,
          selectedGame.id
        )
        if (!cancelled) setWordChallengesForGame(items)
      } catch (err) {
        console.error(err)
        if (!cancelled) setWordChallengesForGame([])
      } finally {
        if (!cancelled) setLoadingWordOptions(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [selectedGame?.id, profile?.school_id])

  if (loading) return <p style={styles.loading}>🔄 Carregando…</p>
  if (error) return <p style={styles.error}>{error}</p>

  const disciplineOptions = buildDisciplineOptions(docsList, wordChallengesForGame)
  const subareaOptions = buildSubareaOptions(
    discipline,
    docsList,
    wordChallengesForGame
  )

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
      const sessionNumber = await createSession(selectedGame.id)

      await apiFetch('/events/platform', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: 'game_start',
          game_id: selectedGame.id,
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
        game_id: selectedGame.id,
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
    setWordChallengesForGame([])
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
                key={game.id}
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
              {loadingWordOptions && (
                <p style={styles.optionsHint}>Carregando opções de conteúdo…</p>
              )}
              <div style={styles.field}>
                <label>Disciplina *</label>
                <select
                  value={discipline}
                  onChange={e => {
                    setDiscipline(e.target.value)
                    setSubarea('')
                  }}
                  disabled={loadingWordOptions}
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
                  disabled={!discipline || loadingWordOptions}
                  style={{
                    ...styles.select,
                    borderColor: subarea ? '#ccc' : 'red',
                    backgroundColor: discipline ? '#fff' : '#f5f5f5',
                  }}
                  required
                >
                  <option value="">Selecione...</option>
                  {subareaOptions.map(s => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              {!loadingWordOptions && disciplineOptions.length === 0 && (
                <p style={styles.optionsWarn}>
                  Nenhum conteúdo cadastrado. Peça ao professor para enviar documentos ou
                  criar desafios de palavras neste jogo.
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onStart}
            disabled={
              loadingSession ||
              loadingWordOptions ||
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
  field: { display: 'flex', flexDirection: 'column', flex: 1, gap: 6 },
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
