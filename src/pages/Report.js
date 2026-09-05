// src/pages/Report.js
import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'
import {
  LuCheck, LuX, LuTarget, LuTimer, LuListChecks, LuLightbulb, LuChevronDown,
  LuMessageSquareHeart, LuTrophy, LuBrain,
} from 'react-icons/lu'
import { AppShell, Card, Button, Loader, PageHead, Badge, EmptyState, Stat } from '../components/ui'
import { API_BASE_URL } from '../api/config';

/** Anel de precisão: leitura imediata do resultado, sem depender de libs. */
function AccuracyRing({ value }) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div
      style={{
        width: 132, height: 132, borderRadius: '50%', flex: 'none',
        display: 'grid', placeItems: 'center',
        background: `conic-gradient(var(--a2l-mint-500) ${pct * 3.6}deg, var(--a2l-line-soft) 0deg)`,
        transition: 'background 700ms var(--a2l-ease)',
      }}
      role="img"
      aria-label={`Precisão de ${pct} por cento`}
    >
      <div
        style={{
          width: 104, height: 104, borderRadius: '50%',
          background: 'var(--a2l-surface)',
          display: 'grid', placeItems: 'center',
          boxShadow: 'var(--a2l-inset)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              fontFamily: 'var(--a2l-font-display)', fontWeight: 800,
              fontSize: 'var(--a2l-text-2xl)', letterSpacing: '-0.04em',
              color: 'var(--a2l-ink-900)', lineHeight: 1,
            }}
          >
            {pct}%
          </div>
          <div style={{ fontSize: 'var(--a2l-text-xs)', color: 'var(--a2l-ink-500)', fontWeight: 600, marginTop: 3 }}>
            precisão
          </div>
        </div>
      </div>
    </div>
  )
}

/** Card de questão expansível (mostra o raciocínio ao abrir). */
function QuestionCard({ q, tone, expanded, onToggle }) {
  const isCorrect = tone === 'correct'
  return (
    <Card
      quiet
      onClick={onToggle}
      style={{
        padding: 16,
        cursor: 'pointer',
        borderColor: expanded
          ? (isCorrect ? 'var(--a2l-success-br)' : 'var(--a2l-danger-br)')
          : 'var(--a2l-line)',
        boxShadow: expanded ? 'var(--a2l-shadow)' : 'var(--a2l-shadow-xs)',
        transition: 'all var(--a2l-normal) var(--a2l-ease)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <span
          className={`a2l-icon-chip ${isCorrect ? 'a2l-icon-chip--mint' : 'a2l-icon-chip--danger'}`}
          style={{ width: 28, height: 28, borderRadius: 9 }}
        >
          {isCorrect ? <LuCheck size={16} /> : <LuX size={16} />}
        </span>
        <p style={{ flex: 1, fontWeight: 600, color: 'var(--a2l-ink-900)', lineHeight: 1.45 }}>
          {q.question}
        </p>
        <LuChevronDown
          size={17}
          style={{
            flex: 'none', color: 'var(--a2l-ink-400)', marginTop: 4,
            transform: expanded ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--a2l-normal) var(--a2l-ease)',
          }}
        />
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 12, paddingLeft: 38 }}>
        <Badge tone={isCorrect ? 'success' : 'danger'}>Você: {q.chosen_answer}</Badge>
        {!isCorrect && <Badge tone="success">Correta: {q.correct_answer}</Badge>}
        <Badge tone="neutral" icon={<LuTimer size={12} />}>{q.time_to_answer.toFixed(1)}s</Badge>
      </div>

      {expanded && q.math_reasoning && (
        <div
          className="a2l-anim-in"
          style={{
            marginTop: 14, marginLeft: 38, padding: 14,
            background: 'var(--a2l-surface-2)',
            border: '1px solid var(--a2l-line)',
            borderRadius: 'var(--a2l-radius)',
            fontSize: 'var(--a2l-text-base)',
            lineHeight: 1.6,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6,
              fontFamily: 'var(--a2l-font-display)', fontWeight: 700,
              fontSize: 'var(--a2l-text-xs)', textTransform: 'uppercase',
              letterSpacing: '0.06em', color: 'var(--a2l-brand-600)',
            }}
          >
            <LuBrain size={13} /> Raciocínio
          </div>
          <p style={{ color: 'var(--a2l-ink-700)' }}>{q.math_reasoning}</p>
        </div>
      )}
    </Card>
  )
}

export default function Report() {
  const [user, loadingAuth] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [correctList, setCorrectList] = useState([])
  const [wrongList, setWrongList] = useState([])
  const [expandedIdx, setExpandedIdx] = useState(null)
  const navigate = useNavigate()
  const { search } = useLocation()

  // Extrai parâmetros da URL
  const params = new URLSearchParams(search)
  const schoolId      = params.get('school_id')   || ''
  const discipline    = params.get('discipline')  || ''
  const subarea       = params.get('subarea')     || ''
  const sessionNumber = params.get('session_number') || ''

  useEffect(() => {
    if (loadingAuth) return
    if (!user) {
      navigate('/login')
      return
    }

    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res = await fetch(
          `${API_BASE_URL}/evaluate_responses`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              school_id: schoolId,
              discipline,
              subarea,
              session_number: sessionNumber,
            }),
          }
        )
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const json = await res.json()

        setReport(json.report ?? null)
        setCorrectList(Array.isArray(json.correct_list) ? json.correct_list : [])
        setWrongList(Array.isArray(json.wrong_list) ? json.wrong_list : [])
      } catch (err) {
        console.error('Failed to load report', err)
      } finally {
        setLoading(false)
      }
    })()
  }, [user, loadingAuth, navigate, schoolId, discipline, subarea, sessionNumber])

  if (loadingAuth || loading) {
    return <Loader label="Analisando seus resultados…" />
  }

  // Métricas para o resumo
  const total    = correctList.length + wrongList.length
  const accuracy = total > 0 ? Math.round((correctList.length / total) * 100) : 0
  const avgTime  = total > 0
    ? (([...correctList, ...wrongList]
        .reduce((sum, q) => sum + q.time_to_answer, 0) / total) || 0
      ).toFixed(2)
    : '0.00'

  // Alterna expansão de cards
  const toggleExpand = idx => {
    setExpandedIdx(expandedIdx === idx ? null : idx)
  }

  // Mensagem de reforço proporcional ao desempenho — encorajadora sem ser boba.
  const headline =
    accuracy >= 80 ? 'Excelente sessão!'
    : accuracy >= 50 ? 'Bom trabalho!'
    : 'Sessão concluída!'

  return (
    <AppShell width="lg" back="/dashboard" backLabel="Painel">
      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuTrophy size={13} /> Resultado da sessão</>}
        hero
        title={headline}
        subtitle="Veja o que você acertou, onde dá para melhorar e o raciocínio por trás de cada questão."
      />

      {/* Resumo: anel de precisão + métricas */}
      <Card hero className="a2l-anim-in a2l-delay-1" style={{ marginBottom: 20 }}>
        <div style={{ display: 'flex', gap: 26, alignItems: 'center', flexWrap: 'wrap' }}>
          <AccuracyRing value={accuracy} />
          <div className="a2l-grid a2l-grid--stats" style={{ flex: '1 1 320px' }}>
            <Stat icon={<LuListChecks size={13} />} label="Questões" value={total} />
            <Stat icon={<LuCheck size={13} />} tone="success" label="Acertos" value={correctList.length} />
            <Stat icon={<LuX size={13} />} tone="danger" label="Erros" value={wrongList.length} />
            <Stat icon={<LuTimer size={13} />} tone="sun" label="Tempo médio" value={`${avgTime}s`} foot="por questão" />
          </div>
        </div>
        {(discipline || subarea) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            {discipline && <Badge tone="brand" icon={<LuTarget size={12} />}>{discipline}</Badge>}
            {subarea && <Badge tone="mint">{subarea}</Badge>}
            {sessionNumber && <Badge tone="neutral">Sessão {sessionNumber}</Badge>}
          </div>
        )}
      </Card>

      {report?.insights?.length > 0 && (
        <section className="a2l-anim-in a2l-delay-2" style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <LuLightbulb size={19} style={{ color: 'var(--a2l-sun-600)' }} />
            Pontos de evolução
          </h2>
          <div className="a2l-grid a2l-grid--wide">
            {report.insights.map((ins, idx) => (
              <Card key={idx} quiet style={{ padding: 18, borderLeft: '4px solid var(--a2l-sun-500)' }}>
                <p style={{ fontFamily: 'var(--a2l-font-display)', fontWeight: 700, color: 'var(--a2l-ink-900)' }}>
                  {ins.error_pattern}
                </p>
                <p style={{ marginTop: 8, color: 'var(--a2l-ink-600)', lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--a2l-ink-800)' }}>Recomendação: </strong>
                  {ins.recommendation}
                </p>
              </Card>
            ))}
          </div>
        </section>
      )}

      <section className="a2l-anim-in a2l-delay-3" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LuCheck size={19} style={{ color: 'var(--a2l-success)' }} />
          Questões corretas
          <Badge tone="success">{correctList.length}</Badge>
        </h2>
        {correctList.length === 0 ? (
          <Card quiet>
            <EmptyState
              icon={<LuTarget size={22} />}
              title="Nenhum acerto nesta sessão"
              description="Revise os pontos de evolução acima e tente de novo — cada rodada ajusta a dificuldade ao seu ritmo."
            />
          </Card>
        ) : (
          <div className="a2l-grid a2l-grid--wide">
            {correctList.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                tone="correct"
                expanded={expandedIdx === `c${i}`}
                onToggle={() => toggleExpand(`c${i}`)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="a2l-anim-in a2l-delay-4" style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
          <LuX size={19} style={{ color: 'var(--a2l-danger)' }} />
          Questões para revisar
          <Badge tone="danger">{wrongList.length}</Badge>
        </h2>
        {wrongList.length === 0 ? (
          <Card quiet>
            <EmptyState
              icon={<LuTrophy size={22} />}
              tone="mint"
              title="Você não errou nenhuma!"
              description="Sessão perfeita. Que tal aumentar o desafio na próxima rodada?"
            />
          </Card>
        ) : (
          <div className="a2l-grid a2l-grid--wide">
            {wrongList.map((q, i) => (
              <QuestionCard
                key={i}
                q={q}
                tone="wrong"
                expanded={expandedIdx === `w${i}`}
                onToggle={() => toggleExpand(`w${i}`)}
              />
            ))}
          </div>
        )}
      </section>

      <Card hero className="a2l-anim-in a2l-delay-5" style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: 'var(--a2l-text-lg)' }}>O que você achou desta sessão?</h3>
        <p style={{ color: 'var(--a2l-ink-500)', marginTop: 6, marginBottom: 18 }}>
          Seu retorno orienta os próximos ajustes da plataforma.
        </p>
        <Button
          icon={<LuMessageSquareHeart size={17} />}
          onClick={() => {
            const qp = new URLSearchParams(search)
            qp.set('session_number', sessionNumber)
            navigate(`/questionnaire?${qp.toString()}`)
          }}
        >
          Avaliar experiência
        </Button>
      </Card>
    </AppShell>
  )
}
