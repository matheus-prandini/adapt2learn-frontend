// src/pages/GameSelect.js
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { getStorage, ref, getDownloadURL } from 'firebase/storage';

export default function GameSelect() {
  const [profile, setProfile]           = useState(null);
  const [docsList, setDocsList]         = useState([]);
  const [gamesList, setGamesList]       = useState([]);
  const [selectedGame, setSelectedGame] = useState(null);
  const [discipline, setDiscipline]     = useState('');
  const [subarea, setSubarea]           = useState('');
  const [loading, setLoading]           = useState(true);
  const [loadingSession, setLoadingSession] = useState(false);
  const [error, setError]               = useState('');
  const navigate                         = useNavigate();
  const storage                          = getStorage();

  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser.getIdToken();

        const prRes = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/me', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!prRes.ok) throw new Error('Falha ao carregar perfil');
        const pr = await prRes.json();
        setProfile(pr);

        const docsRes = await fetch(
          `https://adapt2learn-895112363610.us-central1.run.app/api/documents/school/${pr.school_id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        if (!docsRes.ok) throw new Error('Falha ao carregar documentos');
        const docs = await docsRes.json();
        setDocsList(docs);

        const gamesRes = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/games', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!gamesRes.ok) throw new Error('Falha ao carregar jogos');
        const games = await gamesRes.json();

        const withIcons = await Promise.all(
          games.map(async g => {
            let iconUrl = '';
            if (g.icon_url) {
              iconUrl = await getDownloadURL(ref(storage, g.icon_url));
            }
            return { ...g, iconUrl };
          })
        );
        setGamesList(withIcons);

      } catch (err) {
        console.error(err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <p style={styles.loading}>🔄 Carregando…</p>;
  if (error)   return <p style={styles.error}>{error}</p>;

  const disciplineOptions = Array.from(new Set(docsList.map(d => d.discipline)));
  const subareaOptions = discipline
    ? Array.from(new Set(
        docsList
          .filter(d => d.discipline === discipline)
          .map(d => d.subarea)
      ))
    : [];

  async function createSession(gameId) {
    const token = await auth.currentUser.getIdToken();
    const payload = { game_id: gameId, discipline, subarea };
    const res = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization:  `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      throw new Error(`Não foi possível criar sessão (status ${res.status})`);
    }
    const { session_number } = await res.json();
    return session_number;
  }

  const onStart = async () => {
    setLoadingSession(true);
    try {
      const sessionNumber = await createSession(selectedGame.id);
      const token = await auth.currentUser.getIdToken();

      await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/events/platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          event_type: 'game_start',
          game_id: selectedGame.id,
          payload: {
            discipline,
            subarea,
            session_number: sessionNumber
          }
        })
      });

      const useWarmup = selectedGame.has_warmup && profile.group !== 'grupo3';
      const params = new URLSearchParams({
        user_id:        profile.uid,
        school_id:      profile.school_id,
        discipline,
        subarea,
        session_number: sessionNumber,
        game_id:        selectedGame.id,
        game_path:      selectedGame.path
      }).toString();

      if (useWarmup) {
        navigate(`/warmup?${params}`);
      } else {
        window.location.href = `/${selectedGame.path}/?${params}`;
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao iniciar sessão: ' + err.message);
    } finally {
      setLoadingSession(false);
    }
  };

  const onGameSelect = g => {
    setSelectedGame(g);
    setDiscipline('');
    setSubarea('');
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Voltar</button>

      {!selectedGame ? (
        <>
          <h2 style={styles.header}>🕹️ Escolha um Jogo</h2>
          <div style={styles.grid}>
            {gamesList.map(game => (
              <div
                key={game.id}
                onClick={() => onGameSelect(game)}
                style={styles.card}
              >
                {game.iconUrl
                  ? <img src={game.iconUrl} alt={game.name} style={styles.icon} />
                  : <div style={styles.placeholder} />}
                <div style={styles.gameName}>{game.name}</div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <>
          <button onClick={() => setSelectedGame(null)} style={styles.back}>← Trocar Jogo</button>
          <h2 style={styles.header}>🎯 {selectedGame.name}</h2>

          {selectedGame.has_options && (
            <div style={styles.options}>
              <div style={styles.field}>
                <label>Disciplina (opcional)</label>
                <select
                  value={discipline}
                  onChange={e => { setDiscipline(e.target.value); setSubarea(''); }}
                  style={styles.select}
                >
                  <option value="">Nenhuma</option>
                  {disciplineOptions.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div style={styles.field}>
                <label>Subárea (opcional)</label>
                <select
                  value={subarea}
                  onChange={e => setSubarea(e.target.value)}
                  disabled={!discipline}
                  style={styles.select}
                >
                  <option value="">Nenhuma</option>
                  {subareaOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <p style={styles.hint}>
                Essas opções são <b>opcionais</b>. Você pode iniciar o jogo sem selecionar nada.
              </p>
            </div>
          )}

          <button
            onClick={onStart}
            disabled={loadingSession}
            style={styles.start}
          >
            ▶️ Iniciar Jogo
          </button>
        </>
      )}
    </div>
  );
}

const styles = {
  container:   { padding:20, maxWidth:600, margin:'40px auto', background:'#fffde7', borderRadius:12 },
  back:        { background:'transparent', border:'none', cursor:'pointer', fontSize:16, marginBottom:20 },
  header:      { textAlign:'center', color:'#f57f17', marginBottom:20 },
  grid:        { display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))', gap:16 },
  card:        { cursor:'pointer', background:'#fff', border:'2px solid #ffe082', borderRadius:12, padding:12, textAlign:'center' },
  icon:        { width:80, height:80, marginBottom:8 },
  placeholder: { height:80, marginBottom:8, background:'#eee' },
  gameName:    { fontSize:14, fontWeight:'bold', color:'#33691e' },
  options:     { display:'flex', gap:24, marginBottom:24 },
  field:       { display:'flex', flexDirection:'column', flex:1, gap:6 },
  select:      { padding:8, borderRadius:6, border:'1px solid #ccc' },
  start:       { width:'100%', padding:12, fontSize:16, background:'#66bb6a', color:'#fff', border:'none', borderRadius:8, cursor:'pointer' },
  loading:     { padding:20, textAlign:'center' },
  error:       { padding:20, textAlign:'center', color:'red' }
};
