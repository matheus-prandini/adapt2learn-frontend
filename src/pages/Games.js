// src/pages/Games.js
import React, { useEffect, useState } from 'react'
import { useAuthState }                from 'react-firebase-hooks/auth'
import { auth }                        from '../firebase'
import { getStorage, ref, getDownloadURL } from "firebase/storage"
import { useNavigate }                 from 'react-router-dom'

export default function Games() {
  const [games, setGames]     = useState([])
  const [loading, setLoading] = useState(true)
  const [user, loadingAuth]   = useAuthState(auth)
  const navigate              = useNavigate()
  const storage               = getStorage()

  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        const res   = await fetch('http://localhost:8080/api/games', {
          headers: { Authorization: 'Bearer ' + token }
        })
        const list  = await res.json()
        const withIcons = await Promise.all(
          list.map(async g => {
            let iconUrl = ''
            if (g.icon_url) {
              iconUrl = await getDownloadURL(ref(storage, g.icon_url))
            }
            return { ...g, iconUrl }
          })
        )
        setGames(withIcons)
      } catch (err) {
        console.error("Erro ao carregar jogos:", err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  if (loading || loadingAuth) {
    return <p style={{ padding:20, textAlign:'center' }}>Carregando…</p>
  }

  return (
    <div style={{ padding:20 }}>
      <button onClick={() => navigate('/')} style={{ marginBottom:20 }}>
        ← Voltar
      </button>
      <h2>Jogos Disponíveis</h2>
      <div style={{ display:'flex', gap:20, flexWrap:'wrap' }}>
        {games.map(g => (
          <div
            key={g.id}
            onClick={() =>
              navigate(`/games/${g.id}/select`, { state: { game: g } })
            }
            style={{
              cursor: 'pointer',
              border: '1px solid #ccc',
              borderRadius: 8,
              padding: 12,
              width: 140,
              textAlign: 'center'
            }}
          >
            {g.iconUrl && (
              <img
                src={g.iconUrl}
                alt={g.name}
                style={{ width:64, height:64, marginBottom:8 }}
              />
            )}
            <div>{g.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
