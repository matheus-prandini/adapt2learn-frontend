import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'
import DocumentsSection from './teacher/DocumentsSection'
import WordChallengesSection from './teacher/WordChallengesSection'

const TABS = [
  { id: 'documents', label: 'Documentos', icon: '📂' },
  { id: 'words', label: 'Desafios de palavras', icon: '🔤' },
]

export default function TeacherCreation() {
  const [profile, setProfile] = useState(null)
  const [games, setGames] = useState([])
  const [gameId, setGameId] = useState('')
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea] = useState('')
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
      } catch (err) {
        console.error(err)
        navigate('/')
      } finally {
        setLoading(false)
      }
    })()
  }, [navigate])

  if (loading) {
    return <p style={pageStyles.loading}>Carregando área do professor…</p>
  }

  return (
    <div style={pageStyles.page}>
      <button type="button" onClick={() => navigate('/')} style={pageStyles.back}>
        ← Voltar ao Dashboard
      </button>

      <h1 style={pageStyles.title}>Área de criação</h1>
      <p style={pageStyles.subtitle}>
        Cadastre conteúdo para os jogos: documentos com questões de matemática ou desafios palavra + imagem.
      </p>

      <section style={pageStyles.sharedFilters}>
        <label style={pageStyles.label}>
          Jogo vinculado
          <select
            value={gameId}
            onChange={e => setGameId(e.target.value)}
            style={pageStyles.input}
          >
            <option value="">Selecione um jogo…</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </label>
        <p style={pageStyles.hint}>
          Obrigatório para desafios de palavras. Documentos podem ser enviados independentemente.
        </p>
      </section>

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
            defaultDiscipline={discipline}
            defaultSubarea={subarea}
          />
        )}
        {activeTab === 'words' && (
          <WordChallengesSection
            schoolId={profile?.school_id}
            gameId={gameId}
            discipline={discipline}
            subarea={subarea}
            onDisciplineChange={setDiscipline}
            onSubareaChange={setSubarea}
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
  sharedFilters: {
    background: '#fff',
    padding: 16,
    borderRadius: 10,
    marginBottom: 20,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    fontWeight: 'bold',
    fontSize: 14,
  },
  input: {
    padding: 8,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 15,
    maxWidth: 400,
  },
  hint: { fontSize: 13, color: '#777', marginTop: 8, marginBottom: 0 },
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
