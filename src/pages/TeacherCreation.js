import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'
import { listWordChallengesForSchool } from '../api/wordChallengesApi'
import { buildContentCatalog } from '../utils/contentOptions'
import DocumentsSection from './teacher/DocumentsSection'
import WordChallengesSection from './teacher/WordChallengesSection'
import ContentContextFields from './teacher/ContentContextFields'

const TABS = [
  { id: 'documents', label: 'Documentos', icon: '📂' },
  { id: 'words', label: 'Desafios de palavras', icon: '🔤' },
]

export default function TeacherCreation() {
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [docsList, setDocsList] = useState([])
  const [wordChallengesList, setWordChallengesList] = useState([])
  const [loadingContentOptions, setLoadingContentOptions] = useState(false)
  const [gameId, setGameId] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea] = useState('')
  const [subareaIsCustom, setSubareaIsCustom] = useState(false)
  const [activeTab, setActiveTab] = useState('documents')
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    ;(async () => {
      try {
        const [meRes, gamesRes] = await Promise.all([
          apiFetch('/me'),
          apiFetch('/games'),
        ])
        const me = await parseJsonOrThrow(meRes, 'Não foi possível carregar o perfil.')
        const gamesList = await parseJsonOrThrow(gamesRes, 'Não foi possível carregar jogos.')

        if (!['teacher', 'admin'].includes(me.role)) {
          navigate('/')
          return
        }

        setProfile(me)
        setGames(gamesList)
        if (gamesList.length === 1) setGameId(gamesList[0].id)

        const docsRes = await apiFetch(`/documents/school/${me.school_id}`)
        const docs = await parseJsonOrThrow(docsRes, 'Não foi possível carregar documentos.')
        setDocsList(docs)

        try {
          const wordItems = await listWordChallengesForSchool(me.school_id)
          setWordChallengesList(wordItems)
        } catch (wordErr) {
          console.error(wordErr)
        }
      } catch (err) {
        console.error(err)
        navigate('/')
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

  const refreshContentCatalog = useCallback(async () => {
    if (!profile?.school_id) return

    setLoadingContentOptions(true)
    try {
      const [docsRes, wordItems] = await Promise.all([
        apiFetch(`/documents/school/${profile.school_id}`),
        listWordChallengesForSchool(profile.school_id),
      ])
      const docs = await parseJsonOrThrow(
        docsRes,
        'Não foi possível carregar documentos.'
      )
      setDocsList(docs)
      setWordChallengesList(wordItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingContentOptions(false)
    }
  }, [profile?.school_id])

  const contentCatalog = buildContentCatalog(docsList, wordChallengesList)
  const disciplineOptions = contentCatalog.disciplines
  const subareaOptions = contentCatalog.getSubareas(discipline)

  const handleGameChange = newGameId => {
    setGameId(newGameId)
    setDiscipline('')
    setSubarea('')
    setSubareaIsCustom(false)
  }

  const handleDisciplineChange = value => {
    setDiscipline(value)
    setSubarea('')
    setSubareaIsCustom(false)
  }

  if (loading) {
    return <p style={pageStyles.loading}>Carregando área do professor…</p>
  }

  if (!profile) {
    return null
  }

  return (
    <div style={pageStyles.page}>
      <button type="button" onClick={() => navigate('/')} style={pageStyles.back}>
        ← Voltar ao Dashboard
      </button>

      <h1 style={pageStyles.title}>Área de criação</h1>
      <p style={pageStyles.subtitle}>
        Cadastre conteúdo para os jogos: documentos com questões de matemática ou desafios
        palavra + imagem.
      </p>

      <ContentContextFields
        games={games}
        gameId={gameId}
        onGameChange={handleGameChange}
        discipline={discipline}
        onDisciplineChange={handleDisciplineChange}
        subarea={subarea}
        onSubareaChange={setSubarea}
        subareaIsCustom={subareaIsCustom}
        onSubareaCustomModeChange={setSubareaIsCustom}
        disciplineOptions={disciplineOptions}
        subareaOptions={subareaOptions}
        loadingOptions={loadingContentOptions}
      />

      <nav style={pageStyles.tabs}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            style={{
              ...pageStyles.tab,
              ...(activeTab === tab.id ? pageStyles.tabActive : {}),
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </nav>

      <div style={pageStyles.panel}>
        {activeTab === 'documents' && (
          <DocumentsSection
            discipline={discipline}
            subarea={subarea}
            onContentChanged={refreshContentCatalog}
          />
        )}
        {activeTab === 'words' && (
          <WordChallengesSection
            schoolId={profile.school_id}
            discipline={discipline}
            subarea={subarea}
            onContentChanged={refreshContentCatalog}
          />
        )}
      </div>
    </div>
  )
}

const pageStyles = {
  page: {
    padding: 20,
    maxWidth: 900,
    margin: 'auto',
    backgroundColor: '#e8eaf6',
    borderRadius: 12,
    minHeight: '80vh',
  },
  back: {
    marginBottom: 16,
    background: 'transparent',
    border: 'none',
    fontSize: 16,
    cursor: 'pointer',
  },
  title: {
    textAlign: 'center',
    color: '#283593',
    marginBottom: 8,
    fontSize: 26,
  },
  subtitle: {
    textAlign: 'center',
    color: '#555',
    marginBottom: 24,
    fontSize: 15,
  },
  tabs: {
    display: 'flex',
    gap: 8,
    marginBottom: 0,
    flexWrap: 'wrap',
  },
  tab: {
    flex: 1,
    minWidth: 140,
    padding: '12px 16px',
    border: 'none',
    borderRadius: '10px 10px 0 0',
    background: '#c5cae9',
    cursor: 'pointer',
    fontSize: 15,
    fontWeight: 600,
    color: '#3949ab',
  },
  tabActive: {
    background: '#fff',
    color: '#1a237e',
    boxShadow: '0 -2px 8px rgba(0,0,0,0.06)',
  },
  panel: {
    background: '#fff',
    padding: 24,
    borderRadius: '0 12px 12px 12px',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  loading: { padding: 20, textAlign: 'center', fontSize: 18 },
}
