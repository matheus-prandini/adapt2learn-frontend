import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { getDownloadURL, ref } from 'firebase/storage';
import { storage } from '../firebase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
  const [loadingGames, setLoadingGames] = useState(false);
  const [activeTab, setActiveTab] = useState('students');
  const navigate = useNavigate();

  // Load profile and guard
  useEffect(() => {
    if (loadingAuth) return;
    if (!user) return navigate('/login');
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          'https://adapt2learn-895112363610.us-central1.run.app/api/me',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const data = await res.json();
        if (!['teacher', 'admin'].includes(data.role)) navigate('/');
        setProfile(data);
      } catch {
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
        const url = new URL(
          'https://adapt2learn-895112363610.us-central1.run.app/api/users'
        );
        url.searchParams.set('role', 'student');
        url.searchParams.set('school_id', selectedSchool);
        const res = await fetch(url.toString(), {
          headers: { Authorization: `Bearer ${token}` }
        });
        setStudents(await res.json());
      } catch {
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

  // Load games list once, download icons
  useEffect(() => {
    if (!user) return;
    setLoadingGames(true);
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(
          'https://adapt2learn-895112363610.us-central1.run.app/api/games',
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!res.ok) throw new Error('Erro ao carregar jogos');
        const raw = await res.json();
        const withIcons = await Promise.all(
          raw.map(async g => {
            let iconUrl = '';
            try {
              iconUrl = await getDownloadURL(ref(storage, g.icon_url));
            } catch (e) {
              console.error('Erro ao baixar ícone', e);
            }
            return { ...g, iconUrl };
          })
        );
        setGamesList(withIcons);
      } catch (err) {
        console.error('Erro ao carregar jogos:', err);
      } finally {
        setLoadingGames(false);
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
      if (selectedGame.length)
        params.set('game_names', selectedGame.join(','));
      const res = await fetch(
        `https://adapt2learn-895112363610.us-central1.run.app/api/sessions?${params}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSessions(await res.json());
    } catch {
    } finally {
      setLoadingSessions(false);
    }
  }

  // Update student group
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
    if (res.ok) {
      setStudents(students.map(s =>
        s.uid === uid ? { ...s, group: newGroup } : s
      ));
    }
  }

  // View and delete handlers
  const handleView = id => navigate(`/admin/games/${id}`);
  const handleDelete = async id => {
    if (!window.confirm('Deseja realmente excluir este jogo?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(
        `https://adapt2learn-895112363610.us-central1.run.app/api/games/${id}`,
        { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Falha ao excluir');
      setGamesList(gamesList.filter(g => g.id !== id));
      toast.success('Jogo excluído');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loadingAuth || loadingProfile) {
    return <p style={{ textAlign: 'center', padding: 20 }}>Carregando…</p>;
  }

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <button
        onClick={() => navigate(-1)}
        style={styles.backButton}
      >← Voltar</button>
      <h2 style={styles.heading}>🛠️ Painel de Administração</h2>

      {/* Tabs */}
      <div style={styles.tabs}>
        <button
          onClick={() => setActiveTab('students')}
          style={
            activeTab === 'students'
              ? styles.tabSelected
              : styles.tab
          }
        >👧 Lista de Crianças</button>
        <button
          onClick={() => setActiveTab('sessions')}
          style={
            activeTab === 'sessions'
              ? styles.tabSelected
              : styles.tab
          }
        >🕹️ Sessões Jogadas</button>
        <button
          onClick={() => setActiveTab('games')}
          style={
            activeTab === 'games'
              ? styles.tabSelected
              : styles.tab
          }
        >🎮 Lista de Jogos</button>
      </div>

      {/* Games Tab with Actions */}
      {activeTab === 'games' && (
        <>
          <div style={styles.headerRow}>
            <h3 style={styles.sectionTitle}>Lista de Jogos</h3>
            <button style={styles.createButton} onClick={() => navigate('/admin/games/new')}>
              + Novo Jogo
            </button>
          </div>
          {loadingGames ? (
            <p>🔄 Carregando jogos…</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Ícone</th>
                  <th style={styles.th}>ID</th>
                  <th style={styles.th}>Nome</th>
                  <th style={styles.th}>Warmup?</th>
                  <th style={styles.th}>Opções?</th>
                  <th style={styles.th}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {gamesList.map(g => (
                  <tr key={g.id} style={styles.tr}>
                    <td style={styles.td}>
                      {g.iconUrl && <img src={g.iconUrl} alt="ícone" style={styles.icon} />}
                    </td>
                    <td style={styles.td}>{g.id}</td>
                    <td style={styles.td}>{g.name}</td>
                    <td style={styles.td}>{g.has_warmup ? 'Sim' : 'Não'}</td>
                    <td style={styles.td}>{g.has_options ? 'Sim' : 'Não'}</td>
                    <td style={{ ...styles.td, display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => handleView(g.id)}
                        title="Visualizar"
                        style={styles.actionBtn}
                      >🔍</button>
                      <button
                        onClick={() => handleDelete(g.id)}
                        title="Excluir"
                        style={styles.actionBtn}
                      >🗑️</button>
                    </td>
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
  backButton: { background: 'transparent', border: 'none', fontSize: 16, color: '#333', marginBottom: 16, cursor: 'pointer' },
  heading: { textAlign: 'center', marginBottom: 24, color: '#6a1b9a' },
  tabs: { display: 'flex', gap: 12, justifyContent: 'center', marginBottom: 20 },
  tab: { padding: '8px 16px', backgroundColor: '#eee', border: '1px solid #ccc', cursor: 'pointer', borderRadius: 6 },
  tabSelected: { padding: '8px 16px', backgroundColor: '#d1c4e9', border: '2px solid #6a1b9a', cursor: 'pointer', borderRadius: 6, fontWeight: 'bold', color: '#4a148c' },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sectionTitle: { margin: 0, fontSize: 18, color: '#444' },
  createButton: { padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 16 },
  th: { textAlign: 'left', borderBottom: '2px solid #999', padding: 10, background: '#ede7f6', color: '#4a148c' },
  tr: { borderBottom: '1px solid #ddd' },
  td: { padding: 10, color: '#333' },
  icon: { width: 32, height: 32 },
  actionBtn: { background: 'transparent', border: 'none', fontSize: 18, cursor: 'pointer' }
};
