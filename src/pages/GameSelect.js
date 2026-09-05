// src/pages/GameSelect.js
import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { getStorage, ref, getDownloadURL } from 'firebase/storage'
import { LuGamepad2, LuPlay, LuRepeat, LuTarget, LuInbox } from 'react-icons/lu'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'
import { listWordChallengesForSchool } from '../api/wordChallengesApi'
import {
  buildContentCatalog,
  filterAllowedSubareas,
  getGameId,
  hasSubareaRestriction,
} from '../utils/contentOptions'
import {
  AppShell, Card, Button, Field, Alert, Loader, PageHead, EmptyState,
} from '../components/ui'

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

  const schoolId = profile?.school_id

  // Escolas com restrição ativa (estudo em andamento) só exibem as subáreas
  // permitidas — e escondem disciplinas que ficariam sem nenhuma subárea.
  const disciplineOptions = useMemo(() => {
    if (!hasSubareaRestriction(schoolId)) return contentCatalog.disciplines
    return contentCatalog.disciplines.filter(
      d => filterAllowedSubareas(schoolId, contentCatalog.getSubareas(d)).length > 0
    )
  }, [contentCatalog, schoolId])

  const subareaOptions = useMemo(
    () => filterAllowedSubareas(schoolId, contentCatalog.getSubareas(discipline)),
    [contentCatalog, discipline, schoolId]
  )

  // Com uma única opção disponível, pré-seleciona — menos chance de o aluno
  // escolher errado (ou não escolher) durante a aplicação.
  useEffect(() => {
    if (!discipline && disciplineOptions.length === 1) {
      setDiscipline(disciplineOptions[0])
      setSubarea('')
    }
  }, [discipline, disciplineOptions])

  useEffect(() => {
    if (discipline && !subarea && subareaOptions.length === 1) {
      setSubarea(subareaOptions[0])
    }
  }, [discipline, subarea, subareaOptions])

  if (loading) return <Loader label="Carregando os jogos…" />
  if (error) {
    return (
      <AppShell width="md" back="/">
        <Alert tone="error">{error}</Alert>
      </AppShell>
    )
  }

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

  const missingOptions = selectedGame?.has_options && (!discipline || !subarea)

  return (
    <AppShell width="lg" back="/" backLabel="Painel">
      {!selectedGame ? (
        <>
          <PageHead
            className="a2l-anim-in"
            eyebrow={<><LuGamepad2 size={13} /> Biblioteca</>}
            title="Escolha um jogo"
            subtitle="Cada jogo trabalha habilidades diferentes. Toque em um para começar."
          />

          {gamesList.length === 0 ? (
            <Card>
              <EmptyState
                icon={<LuInbox size={24} />}
                title="Nenhum jogo disponível"
                description="Peça ao seu professor para liberar jogos para a sua escola."
              />
            </Card>
          ) : (
            <div className="a2l-grid a2l-grid--cards a2l-anim-in a2l-delay-1">
              {gamesList.map(game => (
                <Card
                  key={getGameId(game)}
                  interactive
                  onClick={() => onGameSelect(game)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onGameSelect(game)}
                  style={{ textAlign: 'center', padding: 20 }}
                >
                  <div
                    style={{
                      height: 96,
                      display: 'grid',
                      placeItems: 'center',
                      borderRadius: 'var(--a2l-radius-md)',
                      background: 'linear-gradient(160deg, var(--a2l-brand-50), var(--a2l-mint-50))',
                      marginBottom: 14,
                    }}
                  >
                    {game.iconUrl ? (
                      <img
                        src={game.iconUrl}
                        alt=""
                        style={{ width: 72, height: 72, objectFit: 'contain' }}
                      />
                    ) : (
                      <LuGamepad2 size={34} style={{ color: 'var(--a2l-brand-400)' }} />
                    )}
                  </div>
                  <div style={{ fontFamily: 'var(--a2l-font-display)', fontWeight: 700, color: 'var(--a2l-ink-900)' }}>
                    {game.name}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{ maxWidth: 620, margin: '0 auto' }}>
          <PageHead
            className="a2l-anim-in"
            eyebrow={<><LuTarget size={13} /> Preparar sessão</>}
            title={selectedGame.name}
            subtitle={
              selectedGame.has_options
                ? 'Escolha o conteúdo que você quer praticar agora.'
                : 'Tudo pronto — é só começar.'
            }
            action={
              <Button variant="ghost" size="sm" icon={<LuRepeat size={15} />} onClick={() => setSelectedGame(null)}>
                Trocar jogo
              </Button>
            }
          />

          <Card hero className="a2l-anim-in a2l-delay-1">
            {selectedGame.has_options && (
              <div className="a2l-stack" style={{ gap: 18, marginBottom: 22 }}>
                {optionsError && <Alert tone="warning">{optionsError}</Alert>}

                <div className="a2l-grid a2l-grid--2">
                  <Field
                    label="Disciplina"
                    required
                    error={!discipline ? 'Selecione uma disciplina.' : ''}
                  >
                    <select
                      value={discipline}
                      onChange={e => handleDisciplineChange(e.target.value)}
                      disabled={loading}
                      required
                    >
                      <option value="">Selecione…</option>
                      {disciplineOptions.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </Field>

                  <Field
                    label="Subárea"
                    required
                    error={discipline && !subarea ? 'Selecione uma subárea.' : ''}
                  >
                    <select
                      value={subarea}
                      onChange={e => setSubarea(e.target.value)}
                      disabled={!discipline || loading}
                      required
                    >
                      <option value="">
                        {discipline
                          ? subareaOptions.length > 0
                            ? 'Selecione…'
                            : 'Nenhuma subárea cadastrada'
                          : 'Escolha a disciplina primeiro'}
                      </option>
                      {subareaOptions.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </Field>
                </div>

                {!loading && disciplineOptions.length === 0 && (
                  <Alert tone="warning">
                    Nenhum conteúdo cadastrado para esta escola. Peça ao professor para enviar
                    documentos ou criar desafios de palavras.
                  </Alert>
                )}
                {!loading && discipline && subareaOptions.length === 0 && (
                  <Alert tone="warning">
                    Não há subáreas cadastradas para &quot;{discipline}&quot;.
                  </Alert>
                )}
              </div>
            )}

            <Button
              size="lg"
              block
              variant="accent"
              icon={<LuPlay size={18} />}
              onClick={onStart}
              loading={loadingSession}
              disabled={loadingSession || loading || missingOptions}
            >
              {loadingSession ? 'Preparando…' : 'Iniciar jogo'}
            </Button>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
