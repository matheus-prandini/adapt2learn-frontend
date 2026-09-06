import React, { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { LuFolderOpen, LuType, LuPencilRuler } from 'react-icons/lu'
import { apiJson } from '../api/httpClient'
import { useProfile } from '../auth/ProfileContext'
import { listWordChallengesForSchool } from '../api/wordChallengesApi'
import { buildContentCatalog } from '../utils/contentOptions'
import DocumentsSection from './teacher/DocumentsSection'
import WordChallengesSection from './teacher/WordChallengesSection'
import ContentContextFields from './teacher/ContentContextFields'
import { AppShell, Card, Loader, PageHead, Tabs } from '../components/ui'

const TABS = [
  { id: 'documents', label: 'Documentos', icon: <LuFolderOpen size={16} /> },
  { id: 'words', label: 'Desafios de palavras', icon: <LuType size={16} /> },
]

export default function TeacherCreation() {
  // Papel já validado pelo PrivateRoute roles={TEACHER_ROLES}.
  const { profile } = useProfile()
  const schoolId = profile?.school_id
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
    if (!schoolId) return undefined
    let cancelled = false
    ;(async () => {
      try {
        const [gamesList, docs] = await Promise.all([
          apiJson('/games', undefined, 'Não foi possível carregar jogos.'),
          apiJson(
            `/documents/school/${schoolId}`,
            undefined,
            'Não foi possível carregar documentos.'
          ),
        ])
        if (cancelled) return
        setGames(gamesList)
        if (gamesList.length === 1) setGameId(gamesList[0].id)
        setDocsList(docs)

        try {
          const wordItems = await listWordChallengesForSchool(schoolId)
          if (!cancelled) setWordChallengesList(wordItems)
        } catch (wordErr) {
          console.error(wordErr)
        }
      } catch (err) {
        console.error(err)
        if (!cancelled) navigate('/')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [schoolId, navigate])

  const refreshContentCatalog = useCallback(async () => {
    if (!schoolId) return

    setLoadingContentOptions(true)
    try {
      const [docs, wordItems] = await Promise.all([
        apiJson(
          `/documents/school/${schoolId}`,
          undefined,
          'Não foi possível carregar documentos.'
        ),
        listWordChallengesForSchool(schoolId),
      ])
      setDocsList(docs)
      setWordChallengesList(wordItems)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingContentOptions(false)
    }
  }, [schoolId])

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
    return <Loader label="Carregando a área do professor…" />
  }

  if (!profile) {
    return null
  }

  return (
    <AppShell width="xl" back="/" backLabel="Painel">
      <PageHead
        className="a2l-anim-in"
        eyebrow={
          <>
            <LuPencilRuler size={13} /> Área do professor
          </>
        }
        title="Área de criação"
        subtitle="Cadastre conteúdo para os jogos: documentos com questões de matemática ou desafios de palavra + imagem."
      />

      <div className="a2l-anim-in a2l-delay-1">
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
      </div>

      <Card flush className="a2l-anim-in a2l-delay-2">
        <Tabs items={TABS} value={activeTab} onChange={setActiveTab} />
        <div style={{ padding: 24 }}>
          {activeTab === 'documents' && (
            <DocumentsSection
              discipline={discipline}
              subarea={subarea}
              onContentChanged={refreshContentCatalog}
            />
          )}
          {activeTab === 'words' && (
            <WordChallengesSection
              schoolId={schoolId}
              discipline={discipline}
              subarea={subarea}
              onContentChanged={refreshContentCatalog}
            />
          )}
        </div>
      </Card>
    </AppShell>
  )
}
