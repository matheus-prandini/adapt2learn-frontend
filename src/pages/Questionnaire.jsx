// src/pages/Questionnaire.js
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { LuMessageSquareHeart, LuSend, LuPartyPopper, LuArrowLeft } from 'react-icons/lu'
import { AppShell, Card, Button, Alert, PageHead } from '../components/ui'
import { apiJson, jsonBody } from '../api/httpClient'

const QUESTIONS = [
  { id: 'q1', text: 'Você gostou das atividades matemáticas?', options: ['Muito', 'Mais ou menos', 'Não gostei'] },
  { id: 'q2', text: 'O nível de dificuldade foi adequado?',       options: ['Fácil', 'Adequado', 'Difícil'] },
  { id: 'q3', text: 'Você achou o jogo divertido?',              options: ['Sim', 'Mais ou menos', 'Não'] },
]

export default function Questionnaire() {
  const navigate   = useNavigate()
  const { search } = useLocation()
  const [answers, setAnswers]       = useState({})
  const [suggestion, setSuggestion] = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState('')
  const [sending, setSending]       = useState(false)

  const sessionNumber = new URLSearchParams(search).get('session_number') || ''

  const handleChange = (qid, value) => setAnswers(prev => ({ ...prev, [qid]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    setSending(true)
    try {
      await apiJson('/questionnaire', {
        method: 'POST',
        ...jsonBody({
          session_number: Number(sessionNumber),
          feedback: QUESTIONS.map(q => ({
            question_id:   q.id,
            question_text: q.text,
            answer:        answers[q.id] || '',
          })),
          suggestion,
        }),
      }, 'Erro ao enviar feedback.')
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError('Erro ao enviar feedback. Tente novamente.')
    } finally {
      setSending(false)
    }
  }

  if (submitted) {
    return (
      <AppShell width="md" topbar={false}>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: '70vh' }}>
          <Card hero className="a2l-anim-pop" style={{ textAlign: 'center', maxWidth: 440 }}>
            <span className="a2l-icon-chip a2l-icon-chip--lg a2l-icon-chip--solid" style={{ margin: '0 auto 16px' }}>
              <LuPartyPopper size={26} />
            </span>
            <h2 style={{ fontSize: 'var(--a2l-text-xl)' }}>Obrigado pelo seu feedback!</h2>
            <p style={{ color: 'var(--a2l-ink-500)', marginTop: 8, marginBottom: 22 }}>
              Suas respostas ajudam a deixar a plataforma melhor para toda a turma.
            </p>
            <Button variant="secondary" icon={<LuArrowLeft size={17} />} onClick={() => navigate('/')}>
              Voltar ao painel
            </Button>
          </Card>
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell width="md" back={-1}>
      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuMessageSquareHeart size={13} /> Sua opinião</>}
        title="Como foi a experiência?"
        subtitle="São três perguntas rápidas — leva menos de um minuto."
      />

      {error && <Alert tone="error" style={{ marginBottom: 18 }}>{error}</Alert>}

      <form onSubmit={handleSubmit} className="a2l-stack a2l-anim-in a2l-delay-1" style={{ gap: 16 }}>
        {QUESTIONS.map((q, qi) => (
          <Card key={q.id}>
            <fieldset style={{ border: 'none', margin: 0, padding: 0 }}>
              <legend style={{
                fontFamily: 'var(--a2l-font-display)', fontWeight: 700,
                fontSize: 'var(--a2l-text-md)', color: 'var(--a2l-ink-900)',
                marginBottom: 14, padding: 0,
              }}>
                <span style={{ color: 'var(--a2l-brand-500)' }}>{qi + 1}.</span> {q.text}
              </legend>
              <div className="a2l-stack" style={{ gap: 9 }}>
                {q.options.map(opt => (
                  <label key={opt} className={`a2l-option ${answers[q.id] === opt ? 'a2l-option--checked' : ''}`}>
                    <input
                      className="a2l-check" type="radio" name={q.id} value={opt}
                      checked={answers[q.id] === opt}
                      onChange={() => handleChange(q.id, opt)}
                      required
                    />
                    {opt}
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        ))}

        <Card>
          <label className="a2l-label" htmlFor="a2l-suggestion" style={{ fontSize: 'var(--a2l-text-md)', marginBottom: 6 }}>
            Quer sugerir algo?
          </label>
          <p className="a2l-hint" style={{ marginBottom: 10 }}>
            Conte o que você gostaria de encontrar na plataforma.
          </p>
          <textarea
            id="a2l-suggestion" className="a2l-input"
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            placeholder="Escreva aqui suas sugestões…"
            rows={4}
          />
        </Card>

        <Button type="submit" size="lg" icon={<LuSend size={17} />} loading={sending}>
          {sending ? 'Enviando…' : 'Enviar feedback'}
        </Button>
      </form>
    </AppShell>
  )
}
