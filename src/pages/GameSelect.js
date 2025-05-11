// src/pages/GameSelect.js
import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { auth } from '../firebase'

export default function GameSelect() {
  const { state } = useLocation()
  const { game } = state || {}
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [docsList, setDocsList] = useState([])
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea] = useState('')

  useEffect(() => {
    if (!game) {
      navigate('/games')
      return
    }
    ;(async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        const [profileRes, docsRes] = await Promise.all([
          fetch('http://localhost:8080/api/me', {
            headers: { Authorization: 'Bearer ' + token }
          }),
          fetch('http://localhost:8080/api/documents', {
            headers: { Authorization: 'Bearer ' + token }
          })
        ])
        if (!profileRes.ok || !docsRes.ok) throw new Error('Erro ao carregar dados')
        setProfile(await profileRes.json())
        setDocsList(await docsRes.json())
      } catch (err) {
        console.error(err)
        navigate('/games')
      } finally {
        setLoading(false)
      }
    })()
  }, [game, navigate])

  if (loading) {
    return <p style={{ padding:20, textAlign:'center', fontSize:18 }}>🔄 Carregando…</p>
  }

  const disciplineOptions = Array.from(new Set(docsList.map(d => d.discipline)))
  const subareaOptions = discipline
    ? Array.from(new Set(
        docsList
          .filter(d => d.discipline === discipline)
          .map(d => d.subarea)
      ))
    : []

  return (
    <div style={{
      padding: 20,
      maxWidth: 500,
      margin: '40px auto',
      backgroundColor: '#fffde7',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
    }}>
      <button
        onClick={() => navigate(-1)}
        style={{
          background: 'transparent',
          border: 'none',
          fontSize: 16,
          cursor: 'pointer',
          marginBottom: 20
        }}
      >
        ← Voltar
      </button>

      <h2 style={{
        textAlign: 'center',
        color: '#f57f17',
        fontSize: 24,
        marginBottom: 24
      }}>🎮 Preparar: {game.name}</h2>

      <form style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="discipline" style={{ fontWeight: 'bold', marginBottom: 4 }}>Disciplina</label>
          <select
            id="discipline"
            value={discipline}
            onChange={e => { setDiscipline(e.target.value); setSubarea('') }}
            style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
          >
            <option value="">Selecione...</option>
            {disciplineOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label htmlFor="subarea" style={{ fontWeight: 'bold', marginBottom: 4 }}>Subárea</label>
          <select
            id="subarea"
            value={subarea}
            disabled={!discipline}
            onChange={e => setSubarea(e.target.value)}
            style={{ padding: 10, borderRadius: 6, border: '1px solid #ccc', fontSize: 16 }}
          >
            <option value="">Selecione...</option>
            {subareaOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            const qs = new URLSearchParams({
              user_id: profile.uid,
              school_id: profile.school_id,
              discipline,
              subarea
            }).toString()
            window.location.href = `/${game.path}/?${qs}`
          }}
          disabled={!discipline || !subarea}
          style={{
            padding: 12,
            backgroundColor: (!discipline || !subarea) ? '#ccc' : '#66bb6a',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            cursor: (!discipline || !subarea) ? 'not-allowed' : 'pointer'
          }}
        >
          🎲 Iniciar {game.name}
        </button>
      </form>
    </div>
  )
}