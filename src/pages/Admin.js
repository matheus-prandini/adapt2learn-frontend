import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { auth } from '../firebase'
import { useAuthState } from 'react-firebase-hooks/auth'

export default function Admin() {
  const [user, loadingAuth]           = useAuthState(auth)
  const [profile, setProfile]         = useState(null)
  const [students, setStudents]       = useState([])
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [loadingStudents, setLoadingStudents] = useState(true)
  const navigate                      = useNavigate()

  // 1) Primeiro, buscamos o perfil completo (/api/me) pra saber role e school_id
  useEffect(() => {
    if (loadingAuth) return
    if (!user) {
      navigate('/login')
      return
    }

    ;(async () => {
      try {
        const token = await user.getIdToken()
        const res   = await fetch('http://localhost:8080/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Falha ao carregar perfil')
        const data = await res.json()
        // só professores podem ver essa tela
        if (data.role !== 'teacher') {
          navigate('/')
          return
        }
        setProfile(data)
      } catch (err) {
        console.error(err)
        navigate('/')
      } finally {
        setLoadingProfile(false)
      }
    })()
  }, [user, loadingAuth, navigate])

  // 2) Só depois de ter o profile buscamos os alunos desta mesma escola
  useEffect(() => {
    if (loadingProfile) return
    if (!profile) return

    ;(async () => {
      try {
        const token = await user.getIdToken()
        const url = new URL('http://localhost:8080/api/users')
        url.searchParams.set('role', 'student')
        url.searchParams.set('school_id', profile.school_id)
        // endpoint vai ordenar por grade_level
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        })
        if (!res.ok) throw new Error('Falha ao carregar alunos')
        const list = await res.json()
        setStudents(list)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingStudents(false)
      }
    })()
  }, [loadingProfile, profile, user, navigate])

  if (loadingAuth || loadingProfile || loadingStudents) {
    return <p style={{ textAlign:'center', padding:20 }}>Carregando…</p>
  }

  return (
    <div style={{ maxWidth:600, margin:'40px auto', padding:24 }}>
      <h2>🛠️ Painel de Administração</h2>
      <table style={{ width:'100%', borderCollapse:'collapse' }}>
        <thead>
          <tr>
            <th style={th}>Nome</th>
            <th style={th}>E-mail</th>
            <th style={th}>Grade</th>
            <th style={th}>Grupo</th>
          </tr>
        </thead>
        <tbody>
          {students.map(s => (
            <tr key={s.uid}>
              <td style={td}>{s.name}</td>
              <td style={td}>{s.mail}</td>
              <td style={td}>{s.grade_level}</td>
              <td style={td}>
                <select
                  value={s.group || ''}
                  onChange={e => handleGroupChange(s.uid, e.target.value)}
                >
                  <option value="">— selecione —</option>
                  <option value="grupo1">Grupo 1</option>
                  <option value="grupo2">Grupo 2</option>
                  <option value="grupo3">Grupo 3</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  async function handleGroupChange(uid, newGroup) {
    const token = await user.getIdToken()
    const res = await fetch(`http://localhost:8080/api/users/${uid}/group`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ group: newGroup })
    })
    if (!res.ok) {
      alert('Erro ao atualizar grupo')
    } else {
      setStudents(students.map(s =>
        s.uid === uid ? { ...s, group: newGroup } : s
      ))
    }
  }
}

const th = { textAlign:'left', borderBottom:'1px solid #ccc', padding:'8px' }
const td = { padding:'8px', borderBottom:'1px solid #eee' }
