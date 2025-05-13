// src/pages/Report.js
import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'

export default function Report() {
  const [user, loadingAuth] = useAuthState(auth)
  const [loading, setLoading] = useState(true)
  const [report, setReport] = useState(null)
  const [correctList, setCorrectList] = useState([])
  const [wrongList, setWrongList] = useState([])
  const navigate = useNavigate()
  const { search } = useLocation()

  // extrai os parâmetros da URL
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
        const url = new URL('http://localhost:8080/api/evaluate_responses')
        url.searchParams.set('school_id', schoolId)
        url.searchParams.set('discipline', discipline)
        url.searchParams.set('subarea', subarea)
        url.searchParams.set('session_number', sessionNumber)

        const res = await fetch(url.toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          }
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        const json = await res.json()

        setReport(json.report ?? null)
        setCorrectList(Array.isArray(json.correct_list) ? json.correct_list : [])
        setWrongList(Array.isArray(json.wrong_list)   ? json.wrong_list   : [])
      } catch (err) {
        console.error('Failed to load report', err)
      } finally {
        setLoading(false)
      }
    })()
  // inclua sessionNumber para disparar recarga quando ele mudar
  }, [user, loadingAuth, navigate, schoolId, discipline, subarea, sessionNumber])

  if (loadingAuth || loading) {
    return <p style={styles.loading}>🔍 Carregando seus resultados…</p>
  }

  // cálculos para o resumo
  const total    = correctList.length + wrongList.length
  const accuracy = total > 0 ? Math.round((correctList.length / total) * 100) : 0
  const avgTime  = total > 0
    ? (([...correctList, ...wrongList].reduce((sum, q) => sum + q.time_to_answer, 0) / total) || 0).toFixed(2)
    : '0.00'

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>🎉 Parabéns!</h2>
      <p style={styles.subtitle}>Veja como você foi:</p>

      <section style={styles.summarySection}>
        <div style={styles.summaryCard}>
          <div style={styles.metricEmoji}>❓</div>
          <div style={styles.metricValue}>{total}</div>
          <div style={styles.metricLabel}>Questões</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.metricEmoji}>✅</div>
          <div style={styles.metricValue}>{correctList.length}</div>
          <div style={styles.metricLabel}>Acertos</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.metricEmoji}>❌</div>
          <div style={styles.metricValue}>{wrongList.length}</div>
          <div style={styles.metricLabel}>Erros</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.metricEmoji}>🎯</div>
          <div style={styles.metricValue}>{accuracy}%</div>
          <div style={styles.metricLabel}>Precisão</div>
        </div>
        <div style={styles.summaryCard}>
          <div style={styles.metricEmoji}>⏱️</div>
          <div style={styles.metricValue}>{avgTime}s</div>
          <div style={styles.metricLabel}>Média Tempo</div>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>🎲 Questões Corretas ({correctList.length})</h3>
        {correctList.length === 0 ? (
          <p style={styles.empty}>Ops, ainda não há acertos.</p>
        ) : (
          <div style={styles.grid}>
            {correctList.map((q, i) => (
              <div key={i} style={styles.cardAccent}>
                <p style={styles.question}>❓ {q.question}</p>
                <p style={styles.answer}>👉 Você: <strong>{q.chosen_answer}</strong></p>
                <p style={styles.time}>⏱️ {q.time_to_answer.toFixed(2)}s</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>🚧 Questões Incorretas ({wrongList.length})</h3>
        {wrongList.length === 0 ? (
          <p style={styles.empty}>Você não errou nenhuma ainda!</p>
        ) : (
          <div style={styles.grid}>
            {wrongList.map((q, i) => (
              <div key={i} style={styles.cardError}>
                <p style={styles.question}>❓ {q.question}</p>
                <p style={styles.answer}>👉 Você: <strong>{q.chosen_answer}</strong></p>
                <p style={styles.answer}>✅ Certo: <strong>{q.correct_answer}</strong></p>
                <p style={styles.time}>⏱️ {q.time_to_answer.toFixed(2)}s</p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 900,
    margin: '40px auto',
    backgroundColor: '#FFFBF0',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: '"Comic Sans MS", cursive, sans-serif',
    color: '#333',
  },
  title: {
    textAlign: 'center',
    fontSize: 32,
    color: '#FF6F61',
    marginBottom: 4
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 18,
    color: '#555',
    marginBottom: 24
  },
  loading: {
    padding: 20,
    textAlign: 'center',
    fontSize: 20,
    color: '#777'
  },
  summarySection: {
    display: 'flex',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    marginBottom: 32
  },
  summaryCard: {
    backgroundColor: '#FFF3E0',
    width: 120,
    height: 120,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    margin: 8,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
  },
  metricEmoji: {
    fontSize: 24,
    marginBottom: 4
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF8A65'
  },
  metricLabel: {
    fontSize: 12,
    color: '#888'
  },
  section: {
    marginBottom: 24
  },
  sectionTitle: {
    fontSize: 24,
    color: '#FF8A65',
    marginBottom: 12,
    textAlign: 'center'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
    gap: 16
  },
  cardAccent: {
    backgroundColor: '#E8F5E9',
    border: '2px solid #A5D6A7',
    borderRadius: 8,
    padding: 12
  },
  cardError: {
    backgroundColor: '#FFEBEE',
    border: '2px solid #EF9A9A',
    borderRadius: 8,
    padding: 12
  },
  question: {
    fontSize: 16,
    margin: '8px 0',
    color: '#616161'
  },
  answer: {
    fontSize: 14,
    margin: '4px 0'
  },
  time: {
    fontSize: 12,
    marginTop: 6,
    color: '#888'
  },
  empty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  }
}
