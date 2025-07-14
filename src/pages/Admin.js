// src/pages/Admin.js
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';

const SCHOOLS = ['ColégioObjetivo', 'Eseba', 'Associação21Down'];

export default function Admin() {
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [gamesList, setGamesList] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState('Eseba');
  const [selectedGame, setSelectedGame] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const navigate = useNavigate();

  // Load profile and guard
  useEffect(() => {
    if (loadingAuth) return;
    if (!user) return navigate('/login');
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!['teacher', 'admin'].includes(data.role)) navigate('/');
        setProfile(data);
      } catch (err) {
        console.error(err);
        navigate('/');
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [user, loadingAuth]);

  // Fetch students on school change
  useEffect(() => {
    if (!user || !selectedSchool) return;
    setLoadingStudents(true);
    (async () => {
      try {
        const token = await user.getIdToken();
        const url = new URL('https://adapt2learn-895112363610.us-central1.run.app/api/users');
        url.searchParams.set('role', 'student');
        url.searchParams.set('school_id', selectedSchool);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Falha ao carregar alunos');
        setStudents(await res.json());
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingStudents(false);
      }
    })();
    if (activeTab === 'sessions') fetchSessions();
  }, [user, selectedSchool]);

  // Fetch sessions when tab or game filter changes
  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, selectedGame]);

  // Load games list once
  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/games', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Erro ao carregar jogos');
        setGamesList(await res.json());
      } catch (err) {
        console.error('Erro ao carregar jogos:', err);
      }
    })();
  }, [user]);

  // Session fetch helper
  async function fetchSessions() {
    setLoadingSessions(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams();
      params.set('school_id', selectedSchool);
      if (selectedGame.length > 0) params.set('game_names', selectedGame.join(','));
      const res = await fetch(
        `https://adapt2learn-895112363610.us-central1.run.app/api/sessions?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Erro ao buscar sessões');
      setSessions(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingSessions(false);
    }
  }

  // Update student group (optional)
  async function handleGroupChange(uid, newGroup) {
    const token = await user.getIdToken();
    const res = await fetch(
      `https://adapt2learn-895112363610.us-central1.run.app/api/users/${uid}/group`,
      {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ group: newGroup })
      }
    );
    if (!res.ok) alert('Erro ao atualizar grupo');
    else setStudents(students.map(s => s.uid === uid ? { ...s, group: newGroup } : s));
  }

  if (loadingAuth || loadingProfile) {
    return <p style={{ textAlign: 'center', padding: 20 }}>Carregando…</p>;
  }

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>← Voltar</button>
      <h2 style={styles.heading}>🛠️ Painel de Administração</h2>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('students')}
          style={activeTab === 'students' ? styles.tabSelected : styles.tab}
        >👧 Lista de Crianças</button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={activeTab === 'sessions' ? styles.tabSelected : styles.tab}
        >🕹️ Sessões Jogadas</button>
        <button
          onClick={() => setActiveTab('games')}
          style={activeTab === 'games' ? styles.tabSelected : styles.tab}
        >🎮 Lista de Jogos</button>
      </div>

      {/* School Filter */}
      <div style={styles.filterRow}>
        <label>Escola:</label>
        <select
          value={selectedSchool}
          onChange={e => setSelectedSchool(e.target.value)}
          style={styles.select}
        >
          {SCHOOLS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Students Tab */}
      {activeTab === 'students' && (
        loadingStudents ? (
          <p>🔄 Carregando alunos…</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Nome</th>
                <th style={styles.th}>E-mail</th>
                <th style={styles.th}>Série</th>
                <th style={styles.th}>Grupo</th>
              </tr>
            </thead>
            <tbody>
              {students.map(s => (
                <tr key={s.uid}>
                  <td style={styles.td}>{s.name}</td>
                  <td style={styles.td}>{s.mail}</td>
                  <td style={styles.td}>{s.grade_level}</td>
                  <td style={styles.td}>
                    <select
                      value={s.group}
                      onChange={e => handleGroupChange(s.uid, e.target.value)}
                    >
                      <option value="grupo1">grupo1</option>
                      <option value="grupo2">grupo2</option>
                      <option value="grupo3">grupo3</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      )}

      {/* Sessions Tab */}
      {activeTab === 'sessions' && (
        <>
          <div style={styles.filterRow}>
            <label>Filtrar por jogo:</label>
            <div style={{ minWidth: 280, flex: 1 }}>
              <Select
                isMulti
                options={gamesList.map(g => ({ value: g.name, label: g.name }))}
                value={selectedGame.map(name => ({ value: name, label: name }))}
                onChange={sel => setSelectedGame(sel.map(s => s.value))}
                placeholder="Selecione jogos..."
                closeMenuOnSelect={false}
              />
            </div>
          </div>
          {loadingSessions ? (
            <p>🔄 Carregando sessões…</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Usuário</th>
                  <th style={styles.th}>Jogo</th>
                  <th style={styles.th}>Sessão #</th>
                  <th style={styles.th}>Data</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.session_id}>
                    <td style={styles.td}>{s.user_name}</td>
                    <td style={styles.td}>{s.game_name}</td>
                    <td style={styles.td}>{s.session_number}</td>
                    <td style={styles.td}>{
                      s.created_at ? new Date(s.created_at).toLocaleString() : '—'
                    }</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {/* Games Tab */}
      {activeTab === 'games' && (
        <>
          {gamesList.length === 0 ? (
            <p>🔄 Carregando jogos…</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>Warmup?</th>
                  <th style={styles.th}>Opções?</th>
                </tr>
              </thead>
              <tbody>
                {gamesList.map(g => (
                  <tr
                    key={g.id}
                    onClick={() => navigate(`/admin/games/${g.id}`)}
                    style={{ ...styles.td, cursor: 'pointer' }}
                  >
                    <td style={styles.td}>{g.id}</td>
                    <td style={styles.td}>{g.name}</td>
                    <td style={styles.td}>{g.has_warmup ? 'Sim' : 'Não'}</td>
                    <td style={styles.td}>{g.has_options ? 'Sim' : 'Não'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}

const styles = {
  container: { maxWidth: 960, margin: '40px auto', padding: 32, backgroundColor: '#fff8f0', borderRadius: 12, boxShadow: '0 0 10px rgba(0,0,0,0.1)' },
  heading: { textAlign: 'center', marginBottom: 24, color: '#6a1b9a' },
  backButton: { background: 'transparent', border: 'none', fontSize: 16, color: '#333', marginBottom: 16, cursor: 'pointer' },
  tabs: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 },
  tab: { padding: '8px 16px', backgroundColor: '#eee', border: '1px solid #ccc', cursor: 'pointer', borderRadius: 6 },
  tabSelected: { padding: '8px 16px', backgroundColor: '#d1c4e9', border: '2px solid #6a1b9a', cursor: 'pointer', borderRadius: 6, fontWeight: 'bold', color: '#4a148c' },
  filterRow: { marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 },
  select: { padding: '6px', fontSize: 14, borderRadius: 6, border: '1px solid #aaa' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
  th: { textAlign: 'left', borderBottom: '2px solid #999', padding: 10, background: '#ede7f6', color: '#4a148c' },
  td: { padding: 10, borderBottom: '1px solid #ddd' },
};
