// src/pages/GameSelect.js
import React, { useState, useEffect } from 'react';
import { auth }                          from '../firebase';
import { useNavigate }                   from 'react-router-dom';
import { getStorage, ref, getDownloadURL } from "firebase/storage";

export default function GameSelect() {
  const [profile, setProfile]   = useState(null);
  const [docsList, setDocsList] = useState([]);
  const [gamesList, setGamesList] = useState([]);
  const [discipline, setDiscipline] = useState('');
  const [subarea, setSubarea]       = useState('');
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const navigate = useNavigate();
  const storage  = getStorage();

  // Carrega perfil, documentos (pra disciplinas) e lista de jogos
  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const [prRes, docsRes, gamesRes] = await Promise.all([
          fetch('http://localhost:8080/api/me', {
            headers: { Authorization: 'Bearer ' + token }
          }),
          fetch('http://localhost:8080/api/documents', {
            headers: { Authorization: 'Bearer ' + token }
          }),
          fetch('http://localhost:8080/api/games', {
            headers: { Authorization: 'Bearer ' + token }
          })
        ]);
        if (!prRes.ok || !docsRes.ok || !gamesRes.ok) {
          throw new Error('Erro ao carregar dados iniciais');
        }
        const pr    = await prRes.json();
        const docs  = await docsRes.json();
        const games = await gamesRes.json();
        // baixa icons
        const withIcons = await Promise.all(games.map(async g => {
          let iconUrl = '';
          if (g.icon_url) {
            iconUrl = await getDownloadURL(ref(storage, g.icon_url));
          }
          return { ...g, iconUrl };
        }));
        setProfile(pr);
        setDocsList(docs);
        setGamesList(withIcons);
      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p style={{ padding:20, textAlign:'center' }}>🔄 Carregando…</p>;
  }
  if (error) {
    return <p style={{ padding:20, textAlign:'center', color:'red' }}>{error}</p>;
  }

  // opções únicas de disciplina e subárea
  const disciplineOptions = Array.from(new Set(docsList.map(d => d.discipline)));
  const subareaOptions = discipline
    ? Array.from(
        new Set(
          docsList
            .filter(d => d.discipline === discipline)
            .map(d => d.subarea)
        )
      )
    : [];

  // quando clicar no jogo, usa window.location.href pra manter consistente
  const startGame = game => {
    const qs = new URLSearchParams({
      user_id:    profile.uid,
      school_id:  profile.school_id,
      discipline,
      subarea
    }).toString();
    window.location.href = `/${game.path}/?${qs}`;
  };

  return (
    <div style={{
      padding: 20,
      maxWidth: 600,
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
          cursor: 'pointer',
          fontSize: 16,
          marginBottom: 20
        }}
      >
        ← Voltar
      </button>

      <h2 style={{
        textAlign: 'center',
        color: '#f57f17',
        marginBottom: 20
      }}>
        🎲 Selecione Disciplina e Subárea
      </h2>

      <div style={{ display:'flex', flexDirection:'column', gap:16, marginBottom:24 }}>
        <div style={{ textAlign:'left' }}>
          <label style={{ fontWeight:'bold' }}>Disciplina</label>
          <select
            value={discipline}
            onChange={e => { setDiscipline(e.target.value); setSubarea(''); }}
            style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #ccc', marginTop:4 }}
          >
            <option value="">Selecione…</option>
            {disciplineOptions.map(d => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div style={{ textAlign:'left' }}>
          <label style={{ fontWeight:'bold' }}>Subárea</label>
          <select
            value={subarea}
            onChange={e => setSubarea(e.target.value)}
            disabled={!discipline}
            style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #ccc', marginTop:4 }}
          >
            <option value="">Selecione…</option>
            {subareaOptions.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>

      {discipline && subarea && (
        <>
          <h3 style={{ textAlign:'center', color:'#2e7d32', marginBottom:16 }}>🕹️ Escolha um Jogo</h3>
          <div style={{
            display:'grid',
            gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',
            gap:20
          }}>
            {gamesList.map(game => (
              <div
                key={game.id}
                onClick={() => startGame(game)}
                style={{
                  cursor:'pointer',
                  backgroundColor:'#ffffff',
                  border:'2px solid #ffe082',
                  borderRadius:12,
                  padding:16,
                  textAlign:'center',
                  boxShadow:'0 4px 8px rgba(0,0,0,0.1)',
                  transition:'transform 0.2s, box-shadow 0.2s'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.15)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
                }}
              >
                {game.iconUrl
                  ? <img
                      src={game.iconUrl}
                      alt={game.name}
                      style={{ width:80, height:80, marginBottom:12 }}
                    />
                  : <div style={{ height:80, marginBottom:12 }} />
                }
                <div style={{ fontSize:16, fontWeight:'bold', color:'#33691e' }}>
                  {game.name}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
