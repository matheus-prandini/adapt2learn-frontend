// src/pages/Warmup.js
import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthState } from 'react-firebase-hooks/auth'

export default function Warmup() {
  const [profile, setProfile]       = useState(null)
  const [user, loadingAuth]         = useAuthState(auth)
  const [loading, setLoading]       = useState(true)
  const [saving, setSaving]         = useState(false)
  const [example, setExample]       = useState(null)
  const [error, setError]           = useState('')
  const navigate                    = useNavigate()
  const { search }                  = useLocation()

  // parâmetros da URL
  const params         = new URLSearchParams(search)
  const discipline     = params.get('discipline')     || ''
  const subarea        = params.get('subarea')        || ''
  const sessionNumber  = params.get('session_number') || ''
  const gameId         = params.get('game_id')       || ''
  const gamePath       = params.get('game_path')      || ''

  // 1) carregar profile e exemplo
  useEffect(() => {
    if (loadingAuth) return
    if (!user) {
      navigate('/login')
      return
    }
    ;(async () => {
      try {
        const token = await user.getIdToken()

        // busca profile
        const meRes = await fetch('http://localhost:8080/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!meRes.ok) throw new Error('Falha ao carregar perfil')
        setProfile(await meRes.json())

        // busca exemplo de warmup
        const url = new URL('http://localhost:8080/api/warmup_example')
        url.searchParams.set('discipline', discipline)
        url.searchParams.set('subarea', subarea)
        url.searchParams.set('session_number', sessionNumber)

        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error(`Status ${res.status}`)
        setExample(await res.json())
      } catch (err) {
        console.error(err)
        setError('Não foi possível carregar o aquecimento.')
      } finally {
        setLoading(false)
      }
    })()
  }, [user, loadingAuth, discipline, subarea, sessionNumber, navigate])

  if (loadingAuth || loading) {
    return <p style={styles.loading}>🔄 Carregando aquecimento…</p>
  }
  if (error) {
    return <p style={styles.error}>{error}</p>
  }

  // 2) ao concluir, salva e redireciona
  const onFinish = async () => {
    if (!example || !profile) return
    setSaving(true)
    try {
      const token = await user.getIdToken()
      // monta payload esperado pelo endpoint /api/warmup_responses
      const body = [{
        example_id:     example.example_id,
        session_number: Number(sessionNumber),
        messages: [
          { role: 'system',    content: ''                },
          { role: 'user',      content: example.question },
          { role: 'assistant', content: ''                }
        ]
      }]
      const res = await fetch('http://localhost:8080/api/warmup_responses', {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          Authorization:   `Bearer ${token}`
        },
        body: JSON.stringify(body)
      })
      if (!res.ok) {
        throw new Error(`Status ${res.status}`)
      }

      // redireciona para o jogo
      const qs = new URLSearchParams({
        user_id:        profile.uid,
        school_id:      profile.school_id,
        game_id:     gameId,
        discipline,
        subarea,
        session_number: sessionNumber
      }).toString()
      window.location.href = `/${gamePath}/?${qs}`

    } catch (err) {
      console.error(err)
      alert('Erro ao salvar aquecimento: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Voltar</button>
      <h2 style={styles.title}>📖 Aquecimento</h2>

      <div style={styles.card}>
        <p style={styles.question}>{example.question}</p>
      </div>

      <button
        onClick={onFinish}
        disabled={saving}
        style={styles.finish}
      >
        Concluir Aquecimento{saving ? '…' : ''}
      </button>
    </div>
  )
}

const styles = {
  container: {
    padding: 20,
    maxWidth: 600,
    margin: '40px auto',
    backgroundColor: '#FFF8E1',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    fontFamily: '"Comic Sans MS", cursive, sans-serif',
    textAlign: 'center',
  },
  back: {
    background: 'transparent',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    marginBottom: 12
  },
  title: {
    fontSize: 28,
    color: '#FB8C00',
    marginBottom: 24
  },
  card: {
    backgroundColor: '#FFF3E0',
    padding: 24,
    borderRadius: 12,
    marginBottom: 24,
    boxShadow: '0 2px 6px rgba(0,0,0,0.1)'
  },
  question: {
    fontSize: 20,
    color: '#6D4C41',
    lineHeight: 1.4
  },
  finish: {
    padding: '10px 20px',
    fontSize: 16,
    backgroundColor: '#66BB6A',
    color: '#fff',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer'
  },
  loading: {
    padding: 20,
    textAlign: 'center',
    fontSize: 18
  },
  error: {
    padding: 20,
    textAlign: 'center',
    fontSize: 18,
    color: 'red'
  }
}
