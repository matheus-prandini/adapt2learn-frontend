// src/pages/Games.js
import React, { useEffect, useState } from 'react'
import { auth } from '../firebase'
import { getStorage, ref, getDownloadURL } from "firebase/storage"
import { useNavigate } from 'react-router-dom'

export default function Games() {
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const storage = getStorage()

  useEffect(() => {
    ;(async () => {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('http://localhost:8080/api/games', {
        headers: { Authorization: 'Bearer ' + token }
      })
      const list = await res.json()
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
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return <p style={{ padding: 20, textAlign: 'center', fontSize: 18 }}>🔄 Carregando jogos…</p>
  }

  return (
    <div style={{
      padding: 20,
      maxWidth: 900,
      margin: 'auto',
      backgroundColor: '#fffde7',
      borderRadius: 12
    }}>
      {/* Botão de voltar */}
      <button
        onClick={() => navigate(-1)}
        style={{
          marginBottom: 20,
          background: 'transparent',
          border: 'none',
          fontSize: 16,
          cursor: 'pointer'
        }}
      >
        ← Voltar
      </button>

      <h2 style={{
        textAlign: 'center',
        color: '#f57f17',
        fontSize: 28,
        marginBottom: 24
      }}>🕹️ Jogos Disponíveis</h2>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
        gap: 20
      }}>
        {games.map(g => (
          <div
            key={g.id}
            onClick={() => navigate('/launch', { state: { game: g } })}
            style={{
              cursor: 'pointer',
              backgroundColor: '#ffffff',
              border: '2px solid #ffe082',
              borderRadius: 12,
              padding: 16,
              textAlign: 'center',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              transition: 'transform 0.2s, box-shadow 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.transform = 'scale(1.05)'
              e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.transform = 'scale(1)'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)'
            }}
          >
            {g.iconUrl
              ? <img
                  src={g.iconUrl}
                  alt={g.name}
                  style={{ width: 80, height: 80, marginBottom: 12 }}
                />
              : <div style={{ height: 80, marginBottom: 12 }} />
            }
            <div style={{
              fontSize: 16,
              fontWeight: 'bold',
              color: '#33691e'
            }}>{g.name}</div>
          </div>
        ))}
      </div>
    </div>
  )
}