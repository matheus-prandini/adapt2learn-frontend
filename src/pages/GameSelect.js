import React, { useState, useEffect } from 'react'
import { useLocation, useNavigate }    from 'react-router-dom'
import { auth }                        from '../firebase'

export default function GameSelect() {
  const { state }             = useLocation()
  const { game }              = state || {}
  const navigate              = useNavigate()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [docsList, setDocsList] = useState([])
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea]       = useState('')

  // 1) Se não veio o “game” redireciona e carrega perfil + documentos
  useEffect(() => {
    if (!game) {
      navigate('/games')
      return
    }
    ;(async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        // busca perfil
        const profileRes = await fetch('http://localhost:8080/api/me', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (!profileRes.ok) throw new Error('Não foi possível carregar seu perfil')
        const user = await profileRes.json()
        setProfile(user)

        // busca documentos para extrair disciplinas e subáreas
        const docsRes = await fetch('http://localhost:8080/api/documents', {
          headers: { Authorization: 'Bearer ' + token }
        })
        if (!docsRes.ok) throw new Error('Falha ao carregar documentos')
        const docs  = await docsRes.json()
        setDocsList(docs)
      } catch (err) {
        console.error(err)
        navigate('/games')
      } finally {
        setLoading(false)
      }
    })()
  }, [game, navigate])

  if (loading) {
    return <p style={{ padding:20, textAlign:'center' }}>Carregando…</p>
  }

  // gera opções únicas de disciplinas e subáreas a partir dos documentos
  const disciplineOptions = Array.from(new Set(docsList.map(d => d.discipline)))
  const subareaOptions   = discipline
    ? Array.from(new Set(
        docsList
          .filter(d => d.discipline === discipline)
          .map(d => d.subarea)
      ))
    : []

  return (
    <div style={{ maxWidth:400, margin:'auto', padding:20 }}>
      <button onClick={() => navigate('/games')} style={{ marginBottom:20 }}>
        ← Voltar
      </button>
      <h2>Preparar: {game.name}</h2>

      <div style={{ marginTop:20 }}>
        <label>Disciplina:</label>
        <select
          value={discipline}
          onChange={e => {
            setDiscipline(e.target.value)
            setSubarea('')
          }}
          style={{ width:'100%', padding:8, marginTop:4 }}
        >
          <option value="">Selecione…</option>
          {disciplineOptions.map(d => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div style={{ marginTop:20 }}>
        <label>Subárea:</label>
        <select
          value={subarea}
          onChange={e => setSubarea(e.target.value)}
          disabled={!discipline}
          style={{ width:'100%', padding:8, marginTop:4 }}
        >
          <option value="">Selecione…</option>
          {subareaOptions.map(s => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <button
        onClick={() => {
          const qs = new URLSearchParams({
            user_id:    profile.uid,
            school_id:  profile.school_id,
            discipline,
            subarea
          }).toString()
          window.location.href = `/${game.path}/?${qs}`
        }}
        disabled={!discipline || !subarea}
        style={{
          marginTop:20,
          width:'100%',
          padding:10,
          backgroundColor: (!discipline||!subarea) ? '#ccc' : '#28a745',
          color:'white',
          border:'none',
          borderRadius:4,
          cursor: (!discipline||!subarea) ? 'not-allowed' : 'pointer'
        }}
      >
        Iniciar {game.name}
      </button>
    </div>
  )
}
