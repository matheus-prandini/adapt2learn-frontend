import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { LuWand, LuPencilLine, LuRefreshCw, LuImageOff, LuInbox, LuPlus } from 'react-icons/lu'
import {
  listWordChallenges,
  createWordChallenges,
  pollWordChallengesList,
} from '../../api/wordChallengesApi'
import { sortWordChallengesByDateDesc } from '../../api/wordChallengeNormalize'
import {
  Card,
  Button,
  Field,
  Alert,
  Badge,
  EmptyState,
  SegmentedControl,
} from '../../components/ui'

function parseWordsInput(text) {
  return text
    .split(/[\n,;]+/)
    .map(w => w.trim())
    .filter(Boolean)
    .slice(0, 30)
}

export default function WordChallengesSection({ schoolId, discipline, subarea, onContentChanged }) {
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
    () => (filtersReady ? { school_id: schoolId, discipline, subarea } : null),
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
      onContentChanged?.()

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
    <div className="a2l-stack" style={{ gap: 32 }}>
      <section>
        <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 6 }}>
          Criar desafios (palavra + imagem)
        </h3>
        {filtersReady ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
              marginBottom: 16,
            }}
          >
            <span className="a2l-eyebrow-sm">Contexto</span>
            <Badge tone="brand">{discipline}</Badge>
            <Badge tone="mint">{subarea}</Badge>
          </div>
        ) : (
          <Alert tone="warning" style={{ marginBottom: 16 }}>
            Selecione disciplina e subárea no contexto acima para criar ou listar desafios.
          </Alert>
        )}

        <Card quiet as="form" onSubmit={handleCreate} style={{ padding: 20 }}>
          <SegmentedControl
            style={{ display: 'flex', width: '100%', marginBottom: 20 }}
            value={mode}
            onChange={setMode}
            items={[
              { id: 'manual', label: 'Palavras manuais', icon: <LuPencilLine size={14} /> },
              { id: 'ai', label: 'Gerar com IA', icon: <LuWand size={14} /> },
            ]}
          />

          {mode === 'manual' ? (
            <Field
              label="Palavras"
              hint="De 1 a 30 palavras — uma por linha ou separadas por vírgula."
            >
              <textarea
                value={wordsText}
                onChange={e => setWordsText(e.target.value)}
                rows={5}
                placeholder={'gato\ncachorro\npássaro'}
                disabled={!filtersReady || creating}
              />
            </Field>
          ) : (
            <div
              style={{
                display: 'grid',
                gap: 16,
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              }}
            >
              <Field label="Quantidade" hint="Entre 1 e 30.">
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={count}
                  onChange={e => setCount(e.target.value)}
                  disabled={!filtersReady || creating}
                />
              </Field>
              <Field label="Tema" optional>
                <input
                  type="text"
                  placeholder="Ex: animais da fazenda"
                  value={topic}
                  onChange={e => setTopic(e.target.value)}
                  disabled={!filtersReady || creating}
                />
              </Field>
              <Field label="Série" optional>
                <input
                  type="text"
                  placeholder="Ex: 3º ano"
                  value={gradeLevel}
                  onChange={e => setGradeLevel(e.target.value)}
                  disabled={!filtersReady || creating}
                />
              </Field>
            </div>
          )}

          <Button
            type="submit"
            icon={<LuPlus size={17} />}
            loading={creating}
            disabled={!filtersReady || creating}
            style={{ marginTop: 18 }}
          >
            {creating ? 'Gerando…' : 'Criar desafios'}
          </Button>

          {!!status && (
            <p className="a2l-hint" style={{ marginTop: 12 }}>
              {status}
            </p>
          )}
        </Card>
      </section>

      <section>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 14,
            flexWrap: 'wrap',
          }}
        >
          <h3
            style={{
              fontSize: 'var(--a2l-text-lg)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            Desafios cadastrados
            <Badge tone="neutral">{challenges.length}</Badge>
          </h3>
          <Button
            variant="secondary"
            size="sm"
            icon={<LuRefreshCw size={14} />}
            onClick={loadList}
            disabled={!filtersReady || loadingList}
            loading={loadingList}
          >
            Atualizar
          </Button>
        </div>

        {!filtersReady ? (
          <Card quiet>
            <EmptyState
              icon={<LuInbox size={22} />}
              title="Defina o contexto"
              description="Preencha disciplina e subárea para ver os desafios cadastrados."
            />
          </Card>
        ) : loadingList && challenges.length === 0 ? (
          <div className="a2l-grid a2l-grid--cards">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="a2l-skeleton" style={{ height: 190 }} />
            ))}
          </div>
        ) : challenges.length === 0 ? (
          <Card quiet>
            <EmptyState
              icon={<LuWand size={22} />}
              title="Nenhum desafio nesta combinação"
              description="Crie desafios manualmente ou gere com IA no formulário acima."
            />
          </Card>
        ) : (
          <div className="a2l-grid a2l-grid--cards">
            {challenges.map((c, index) => (
              <Card
                key={c.id || `challenge-${index}-${c.word}`}
                as="article"
                flush
                quiet
                className="a2l-card--interactive"
              >
                {c.image_url ? (
                  <img
                    src={c.image_url}
                    alt={c.word || 'Desafio'}
                    style={{ width: '100%', height: 130, objectFit: 'cover', display: 'block' }}
                    loading="lazy"
                  />
                ) : (
                  <div
                    style={{
                      height: 130,
                      display: 'grid',
                      placeItems: 'center',
                      background:
                        'linear-gradient(160deg, var(--a2l-brand-50), var(--a2l-mint-50))',
                      color: 'var(--a2l-ink-400)',
                    }}
                  >
                    <LuImageOff size={24} />
                  </div>
                )}
                <div style={{ padding: 14 }}>
                  <strong
                    style={{
                      display: 'block',
                      fontFamily: 'var(--a2l-font-display)',
                      fontSize: 'var(--a2l-text-md)',
                      color: 'var(--a2l-ink-900)',
                    }}
                  >
                    {c.word || '—'}
                  </strong>
                  {c.created_at && (
                    <span className="a2l-hint" style={{ display: 'block', marginTop: 2 }}>
                      {new Date(c.created_at).toLocaleString('pt-BR')}
                    </span>
                  )}
                  {c.pedagogical_badges?.length > 0 ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 10 }}>
                      {c.pedagogical_badges.map(badge => (
                        <Badge key={badge.key} tone="brand">
                          {badge.text}
                        </Badge>
                      ))}
                    </div>
                  ) : c.pedagogical_summary ? (
                    <p className="a2l-hint" style={{ marginTop: 8 }}>
                      {c.pedagogical_summary}
                    </p>
                  ) : null}
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
