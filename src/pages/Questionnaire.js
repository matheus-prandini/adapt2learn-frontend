// src/pages/Questionnaire.js
import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { auth } from '../firebase'

export default function Questionnaire() {
  const navigate    = useNavigate()
  const { search }  = useLocation()
  const [answers, setAnswers]       = useState({})
  const [suggestion, setSuggestion] = useState('')
  const [submitted, setSubmitted]   = useState(false)
  const [error, setError]           = useState('')

  // ler params
  const params = new URLSearchParams(search)
  const sessionNumber = params.get('session_number')|| ''

  const questions = [
    { id: 'q1', text: 'Você gostou das atividades matemáticas?', options: ['Muito','Mais ou menos','Não gostei'] },
    { id: 'q2', text: 'O nível de dificuldade foi adequado?',       options: ['Fácil','Adequado','Difícil'] },
    { id: 'q3', text: 'Você achou o jogo divertido?',              options: ['Sim','Mais ou menos','Não'] },
  ]

  const handleChange = (qid, value) =>
    setAnswers(prev => ({ ...prev, [qid]: value }))

  const handleSubmit = async e => {
    e.preventDefault()
    setError('')
    try {
      const token = await auth.currentUser.getIdToken()
      const payload = {
        session_number: Number(sessionNumber),
        feedback: questions.map(q => ({
          question_id:   q.id,
          question_text: q.text,
          answer:        answers[q.id] || ''
        })),
        suggestion
      }

      const res = await fetch('http://localhost:8080/api/questionnaire', {
        method: 'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`Status ${res.status}`)
      setSubmitted(true)
    } catch (err) {
      console.error(err)
      setError('Erro ao enviar feedback. Tente novamente.')
    }
  }

  if (submitted) {
    return (
      <div style={styles.container}>
        <h2>🙏 Obrigado pelo seu feedback!</h2>
        <button onClick={() => navigate('/dashboard')} style={styles.back}>
          ← Voltar ao Menu
        </button>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <h2>📝 Questionário de Feedback</h2>
      {error && <p style={{ color:'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={styles.form}>
        {questions.map(q => (
          <fieldset key={q.id} style={styles.fieldset}>
            <legend style={styles.legend}>{q.text}</legend>
            {q.options.map(opt => (
              <label key={opt} style={styles.label}>
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => handleChange(q.id, opt)}
                  required
                />{' '}
                {opt}
              </label>
            ))}
          </fieldset>
        ))}

        <div style={styles.suggestionContainer}>
          <label style={styles.suggestionLabel}>
            Dê sugestões e comente o que gostaria de encontrar na plataforma:
          </label>
          <textarea
            value={suggestion}
            onChange={e => setSuggestion(e.target.value)}
            placeholder="Escreva aqui suas sugestões..."
            rows={4}
            style={styles.suggestionInput}
          />
        </div>

        <button type="submit" style={styles.submitButton}>
          Enviar Feedback
        </button>
      </form>
    </div>
  )
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 600,
    margin: '40px auto',
    backgroundColor: '#FFF',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: 'Arial, sans-serif',
    textAlign: 'center'
  },
  back: {
    background: '#FFD54F',
    border: 'none',
    borderRadius: 6,
    padding: '6px 12px',
    cursor: 'pointer',
    marginTop: 16,
    fontWeight: 'bold'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    marginTop: 24
  },
  fieldset: {
    border: '1px solid #ccc',
    borderRadius: 8,
    padding: 16,
    textAlign: 'left'
  },
  legend: {
    fontWeight: 'bold',
    marginBottom: 12
  },
  label: {
    display: 'block',
    marginBottom: 8,
    cursor: 'pointer'
  },
  suggestionContainer: {
    textAlign: 'left',
    marginBottom: 24
  },
  suggestionLabel: {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: 8
  },
  suggestionInput: {
    width: '100%',
    padding: 10,
    borderRadius: 6,
    border: '1px solid #ccc',
    fontSize: 14,
    minHeight: 80
  },
  submitButton: {
    padding: '12px 24px',
    backgroundColor: '#4FC3F7',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 16,
    cursor: 'pointer'
  }
}
