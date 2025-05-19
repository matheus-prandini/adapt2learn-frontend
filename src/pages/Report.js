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
  const [expandedIdx, setExpandedIdx] = useState(null) // índice expandido
  const navigate = useNavigate()
  const { search } = useLocation()

  // extrai parâmetros da URL
  const params = new URLSearchParams(search)
  const schoolId      = params.get('school_id')   || ''
  const discipline    = params.get('discipline')  || ''
  const subarea       = params.get('subarea')     || ''
  const sessionNumber = params.get('session_number') || ''

  useEffect(() => {
    if (loadingAuth) return;
    if (!user) {
        navigate('/login');
        return;
    }

    (async () => {
        try {
        const token = await user.getIdToken();
        const res = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/evaluate_responses', {
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
        });

        if (!res.ok) throw new Error(`Status ${res.status}`);
        const json = await res.json();

        setReport(json.report ?? null);
        setCorrectList(Array.isArray(json.correct_list) ? json.correct_list : []);
        setWrongList(Array.isArray(json.wrong_list) ? json.wrong_list : []);
        } catch (err) {
        console.error('Failed to load report', err);
        } finally {
        setLoading(false);
        }
    })();
  }, [user, loadingAuth, navigate, schoolId, discipline, subarea, sessionNumber]);


  if (loadingAuth || loading) {
    return <p style={styles.loading}>🔍 Carregando seus resultados…</p>
  }

  // métricas para o resumo
  const total    = correctList.length + wrongList.length
  const accuracy = total > 0 ? Math.round((correctList.length / total) * 100) : 0
  const avgTime  = total > 0
    ? (([...correctList, ...wrongList].reduce((sum, q) => sum + q.time_to_answer, 0) / total) || 0).toFixed(2)
    : '0.00'

  // alterna expansão do card
  const toggleExpand = idx => {
    setExpandedIdx(expandedIdx === idx ? null : idx)
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate('/dashboard')} style={styles.back}>
        ← Voltar ao Menu
      </button>

      <h2 style={styles.title}>🎉 Parabéns!</h2>
      <p style={styles.subtitle}>Veja como você foi:</p>

      <section style={styles.summarySection}>
        {[
          { emoji: '❓', value: total,  label: 'Questões' },
          { emoji: '✅', value: correctList.length, label: 'Acertos' },
          { emoji: '❌', value: wrongList.length,   label: 'Erros' },
          { emoji: '🎯', value: `${accuracy}%`,     label: 'Precisão' },
          { emoji: '⏱️', value: `${avgTime}s`,      label: 'Média Tempo' },
        ].map((item,i) => (
          <div key={i} style={styles.summaryCard}>
            <div style={styles.metricEmoji}>{item.emoji}</div>
            <div style={styles.metricValue}>{item.value}</div>
            <div style={styles.metricLabel}>{item.label}</div>
          </div>
        ))}
      </section>

      {/* Questões Corretas */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>🎲 Questões Corretas ({correctList.length})</h3>
        {correctList.length === 0 ? (
          <p style={styles.empty}>Ops, ainda não há acertos.</p>
        ) : (
          <div style={styles.grid}>
            {correctList.map((q, i) => (
              <div
                key={i}
                style={{
                  ...styles.cardAccent,
                  ...(expandedIdx === `c${i}` ? styles.expandedCard : {})
                }}
                onClick={() => toggleExpand(`c${i}`)}
              >
                <p style={styles.question}>❓ {q.question}</p>
                <p style={styles.answer}>👉 Você: <strong>{q.chosen_answer}</strong></p>
                <p style={styles.time}>⏱️ {q.time_to_answer.toFixed(2)}s</p>
                {expandedIdx === `c${i}` && (
                  <div style={styles.reasoning}>
                    <strong>Raciocínio:</strong>
                    <p>{q.math_reasoning}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Questões Incorretas */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>🚧 Questões Incorretas ({wrongList.length})</h3>
        {wrongList.length === 0 ? (
          <p style={styles.empty}>Você não errou nenhuma ainda!</p>
        ) : (
          <div style={styles.grid}>
            {wrongList.map((q, i) => (
              <div
                key={i}
                style={{
                  ...styles.cardError,
                  ...(expandedIdx === `w${i}` ? styles.expandedCard : {})
                }}
                onClick={() => toggleExpand(`w${i}`)}
              >
                <p style={styles.question}>❓ {q.question}</p>
                <p style={styles.answer}>👉 Você: <strong>{q.chosen_answer}</strong></p>
                <p style={styles.answer}>✅ Certo: <strong>{q.correct_answer}</strong></p>
                <p style={styles.time}>⏱️ {q.time_to_answer.toFixed(2)}s</p>
                {expandedIdx === `w${i}` && (
                  <div style={styles.reasoning}>
                    <strong>Raciocínio:</strong>
                    <p>{q.math_reasoning}</p>
                  </div>
                )}
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
    textAlign: 'center'
  },
  back: {
    background: '#FFD54F',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    marginBottom: 16,
    fontWeight: 'bold'
  },
  title: {
    fontSize: 32,
    color: '#FF6F61',
    marginBottom: 4
  },
  subtitle: {
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
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
    transition: 'transform 0.2s'
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
    marginBottom: 12
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
    gap: 16
  },
  cardAccent: {
    backgroundColor: '#E8F5E9',
    border: '2px solid #A5D6A7',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
    position: 'relative'
  },
  cardError: {
    backgroundColor: '#FFEBEE',
    border: '2px solid #EF9A9A',
    borderRadius: 8,
    padding: 12,
    cursor: 'pointer',
    position: 'relative'
  },
  expandedCard: {
    boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
    transform: 'scale(1.02)'
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
    color: '#888'
  },
  reasoning: {
    marginTop: 12,
    padding: 10,
    background: 'rgba(255, 235, 59, 0.2)',
    borderRadius: 6,
    textAlign: 'left',
    fontSize: 14
  },
  empty: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center'
  }
}
