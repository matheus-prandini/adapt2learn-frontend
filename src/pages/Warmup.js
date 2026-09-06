// src/pages/Warmup.js
import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LuBookOpen, LuCheck, LuSkipForward, LuLightbulb } from 'react-icons/lu'
import { AppShell, Card, Button, Alert, Loader, PageHead, Badge } from '../components/ui'
import { useProfile } from '../auth/ProfileContext'
import { apiJson, jsonBody } from '../api/httpClient'

export default function Warmup() {
  const { profile } = useProfile()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)
  const [example, setExample] = useState(null)
  const [error, setError]     = useState('')
  const navigate   = useNavigate()
  const { search } = useLocation()

  // parâmetros da URL
  const params        = new URLSearchParams(search)
  const discipline    = params.get('discipline')     || ''
  const subarea       = params.get('subarea')        || ''
  const sessionNumber = params.get('session_number') || ''
  const gameId        = params.get('game_id')        || ''
  const gamePath      = params.get('game_path')      || ''

  // Redireciona para o jogo (bundle externo — navegação completa, não SPA)
  const redirectToGame = () => {
    if (!profile) return
    const qs = new URLSearchParams({
      user_id:        profile.uid,
      school_id:      profile.school_id,
      game_id:        gameId,
      discipline,
      subarea,
      session_number: sessionNumber,
    }).toString()
    window.location.href = `/${gamePath}/?${qs}`
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const qs = new URLSearchParams({ discipline, subarea, session_number: sessionNumber })
        const ex = await apiJson(`/warmup_example?${qs}`, undefined, 'Não foi possível carregar o aquecimento.')
        if (!cancelled) setExample(ex)
      } catch (err) {
        console.error(err)
        if (!cancelled) setError('Não foi possível carregar o aquecimento.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [discipline, subarea, sessionNumber])

  if (loading) return <Loader label="Preparando seu aquecimento…" />

  const onFinish = async () => {
    if (!example || !profile) return
    setSaving(true)
    try {
      await apiJson('/warmup_responses', {
        method: 'POST',
        ...jsonBody([{
          example_id:     example.example_id,
          session_number: Number(sessionNumber),
          messages: [
            { role: 'system',    content: ''               },
            { role: 'user',      content: example.question },
            { role: 'assistant', content: ''               },
          ],
        }]),
      }, 'Erro ao salvar aquecimento.')
      redirectToGame()
    } catch (err) {
      console.error(err)
      alert('Erro ao salvar aquecimento: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppShell width="md" back={-1}>
      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuBookOpen size={13} /> Antes de jogar</>}
        title="Aquecimento"
        subtitle="Leia com calma. Pensar no exemplo antes de começar ajuda a fixar o raciocínio."
      />

      {error ? (
        <div className="a2l-stack a2l-anim-in" style={{ gap: 16 }}>
          <Alert tone="error">{error}</Alert>
          <Button variant="secondary" icon={<LuSkipForward size={17} />} onClick={redirectToGame}>
            Pular aquecimento e jogar
          </Button>
        </div>
      ) : (
        <div className="a2l-stack a2l-anim-in a2l-delay-1" style={{ gap: 20 }}>
          <Card hero>
            <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <span className="a2l-icon-chip a2l-icon-chip--sun"><LuLightbulb size={20} /></span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                  {discipline && <Badge tone="brand">{discipline}</Badge>}
                  {subarea && <Badge tone="mint">{subarea}</Badge>}
                </div>
                <p style={{
                  fontFamily: 'var(--a2l-font-display)', fontSize: 'var(--a2l-text-lg)',
                  lineHeight: 1.6, color: 'var(--a2l-ink-900)', fontWeight: 600,
                }}>
                  {example.question}
                </p>
              </div>
            </div>
          </Card>

          <Button size="lg" variant="accent" icon={<LuCheck size={18} />} onClick={onFinish} loading={saving} disabled={saving}>
            {saving ? 'Salvando…' : 'Concluir e jogar'}
          </Button>
        </div>
      )}
    </AppShell>
  )
}
