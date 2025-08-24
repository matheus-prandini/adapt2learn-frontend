import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '../firebase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const SCHOOLS = ['ColégioObjetivo', 'Eseba', 'Associação21Down'];

export default function Admin() {
  const navigate = useNavigate();
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState(null);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [gamesList, setGamesList] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(SCHOOLS[1]);
  const [selectedGame, setSelectedGame] = useState([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [loadingGames, setLoadingGames] = useState(false);
  const [activeTab, setActiveTab] = useState('metrics');

  // NOVOS ESTADOS DE FILTRO DE METRICS
  const [filterUser, setFilterUser] = useState('');
  const [filterEvent, setFilterEvent] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState(dayjs().subtract(7,'day'));
  const [filterDateTo, setFilterDateTo] = useState(dayjs());
  const [metricsData, setMetricsData] = useState([]);

  // Handlers originais
  const handleView = id => navigate(`/admin/games/${id}`);
  const handleDelete = async id => {
    if (!window.confirm('Deseja realmente excluir este jogo?')) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`/api/games/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao excluir');
      setGamesList(prev => prev.filter(g => g.id !== id));
      toast.success('Jogo excluído');
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Load profile and guard
  useEffect(() => {
    if (loadingAuth) return;
    if (!user) return navigate('/login');
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
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

  // Fetch students
  useEffect(() => {
    if (!user || !selectedSchool) return;
    setLoadingStudents(true);
    (async () => {
      try {
        const token = await user.getIdToken();
        const url = new URL('/api/users', window.location.origin);
        url.searchParams.set('role', 'student');
        url.searchParams.set('school_id', selectedSchool);
        const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
        const data = await res.json();
        setStudents(data);
      } catch {
        toast.error('Erro ao carregar lista de crianças');
      } finally {
        setLoadingStudents(false);
      }
    })();
  }, [user, selectedSchool]);

  // Fetch sessions
  const fetchSessions = async () => {
    setLoadingSessions(true);
    try {
      const token = await user.getIdToken();
      const params = new URLSearchParams({ school_id: selectedSchool });
      if (selectedGame.length) params.set('game_names', selectedGame.join(','));
      const res = await fetch(`/api/sessions?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSessions(data);
    } catch {
      toast.error('Erro ao carregar sessões');
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'sessions') fetchSessions();
  }, [activeTab, selectedSchool, selectedGame]);

  // Load games
  useEffect(() => {
    if (!user) return;
    setLoadingGames(true);
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch('/api/games', { headers: { Authorization: `Bearer ${token}` } });
        const raw = await res.json();
        const withIcons = await Promise.all(
          raw.map(async g => {
            let iconUrl = '';
            try { iconUrl = await getDownloadURL(storageRef(storage, g.icon_url)); } catch {}
            return { ...g, iconUrl };
          })
        );
        setGamesList(withIcons);
      } catch {
        toast.error('Erro ao carregar jogos');
      } finally {
        setLoadingGames(false);
      }
    })();
  }, [user]);

  // NOVA FUNÇÃO PARA BUSCAR MÉTRICAS
  const fetchMetrics = async () => {
    try {
      const params = new URLSearchParams({
        ...(filterUser ? { user_id: filterUser } : {}),
        ...(filterEvent ? { event_type: filterEvent } : {}),
        ...(filterDateFrom ? { date_from: filterDateFrom.toISOString() } : {}),
        ...(filterDateTo ? { date_to: filterDateTo.toISOString() } : {})
      });

      const token = await user.getIdToken();
      const res = await fetch(`/api/metrics?${params}`, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setMetricsData(data);
    } catch(err) {
      toast.error('Erro ao carregar métricas');
    }
  };

  if (loadingAuth || loadingProfile) return <p style={{ textAlign: 'center', padding: 20 }}>Carregando…</p>;

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <button onClick={() => navigate(-1)} style={styles.backButton}>← Voltar</button>
      <h2 style={styles.heading}>🛠️ Painel de Administração</h2>
      <div style={styles.tabs}>
        {['metrics', 'students', 'sessions', 'games'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={activeTab === tab ? styles.tabSelected : styles.tab}
          >
            {tab === 'students'
              ? '👧 Lista de Crianças'
              : tab === 'sessions'
              ? '🕹️ Sessões Jogadas'
              : tab === 'games'
              ? '🎮 Lista de Jogos'
              : '📊 Métricas'}
          </button>
        ))}
      </div>

      {/* ABA DE MÉTRICAS */}
      {activeTab === 'metrics' && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div>
            <div style={styles.filterRow}>
              <input
                placeholder="User ID"
                value={filterUser}
                onChange={e => setFilterUser(e.target.value)}
                style={styles.input}
              />
              <input
                placeholder="Tipo de Evento"
                value={filterEvent}
                onChange={e => setFilterEvent(e.target.value)}
                style={styles.input}
              />
              <DatePicker
                value={filterDateFrom}
                onChange={setFilterDateFrom}
                slotProps={{ textField: { style: styles.input } }}
              />
              <DatePicker
                value={filterDateTo}
                onChange={setFilterDateTo}
                slotProps={{ textField: { style: styles.input } }}
              />
              <button onClick={fetchMetrics} style={styles.actionBtn}>🔍 Aplicar</button>
            </div>

            {/* Exemplo gráfico de linha */}
            <div style={{ marginTop: 24 }}>
              <h3 style={styles.sectionTitle}>Eventos por Dia</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={metricsData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="count" stroke="#d81b60" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </LocalizationProvider>
      )}

      {activeTab === 'students' && (
        <>
          <h3 style={styles.sectionTitle}>Filtro de Escola</h3>
          <Select
            options={SCHOOLS.map(s => ({ value: s, label: s }))}
            value={{ value: selectedSchool, label: selectedSchool }}
            onChange={opt => setSelectedSchool(opt.value)}
          />
          {loadingStudents ? (
            <p>🔄 Carregando crianças…</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr><th style={styles.th}>Nome</th><th style={styles.th}>Email</th><th style={styles.th}>Grupo</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.uid} style={styles.tr}>
                    <td style={styles.td}>{s.name}</td>
                    <td style={styles.td}>{s.mail}</td>
                    <td style={styles.td}>{s.group || s.grade_level}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === 'sessions' && (
        <>
          <div style={styles.filterRow}>
            <Select
              options={SCHOOLS.map(s => ({ value: s, label: s }))}
              value={{ value: selectedSchool, label: selectedSchool }}
              onChange={opt => setSelectedSchool(opt.value)}
            />
            <Select
              isMulti
              options={gamesList.map(g => ({ value: g.name, label: g.name }))}
              value={gamesList
                .filter(g => selectedGame.includes(g.name))
                .map(g => ({ value: g.name, label: g.name }))}
              onChange={opts => setSelectedGame(opts.map(o => o.value))}
              placeholder="Filtrar por jogo"
              styles={{ container: base => ({ ...base, width: 200 }) }}
            />
          </div>
          {loadingSessions ? (
            <p>🔄 Carregando sessões…</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Sessão</th>
                  <th style={styles.th}>Jogo</th>
                  <th style={styles.th}>Aluno</th>
                  <th style={styles.th}>Criada em</th>
                  <th style={styles.th}># Sessão</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.session_id} style={styles.tr}>
                    <td style={styles.td}>{s.session_id}</td>
                    <td style={styles.td}>{s.game_name}</td>
                    <td style={styles.td}>{s.user_name}</td>
                    <td style={styles.td}>{new Date(s.created_at).toLocaleString()}</td>
                    <td style={styles.td}>{s.session_number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {activeTab === 'games' && (
        <>
          <div style={styles.headerRow}>
            <h3 style={styles.sectionTitle}>Lista de Jogos</h3>
            <button
              style={styles.createButton}
              onClick={() => navigate('/admin/games/new')}
            >
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
                    <td style={styles.td}>{g.iconUrl && <img src={g.iconUrl} alt="ícone" style={styles.icon} />}</td>
                    <td style={styles.td}>{g.id}</td>
                    <td style={styles.td}>{g.name}</td>
                    <td style={styles.td}>{g.has_warmup ? 'Sim' : 'Não'}</td>
                    <td style={styles.td}>{g.has_options ? 'Sim' : 'Não'}</td>
                    <td style={{ ...styles.td, display: 'flex', gap: 12 }}>
                      <button onClick={() => handleView(g.id)} style={styles.actionBtn}>🔍</button>
                      <button onClick={() => handleDelete(g.id)} style={styles.actionBtn}>🗑️</button>
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
  sectionTitle: { fontSize: 18, color: '#444', margin: '16px 0 8px' },
  filterRow: { display: 'flex', gap: 16, marginBottom: 16, flexWrap: 'wrap' },
  input: { padding: 8, borderRadius: 6, border: '1px solid #ccc', minWidth: 160 },
  headerRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  createButton: { padding: '8px 16px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  actionBtn: { background: '#6a1b9a', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 12px', cursor: 'pointer' },
  table: { width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' },
  th: { textAlign: 'left', borderBottom: '2px solid #999', padding: 10, background: '#ede7f6', color: '#4a148c' },
  tr: { borderBottom: '1px solid #ddd' },
  td: { padding: 10, color: '#333' },
  icon: { width: 32, height: 32 }
};