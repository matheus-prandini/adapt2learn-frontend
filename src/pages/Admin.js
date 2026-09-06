import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { storage } from '../firebase';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import PersonalizationPanel from '../components/PersonalizationPanel';
import {
  LuChartColumn, LuUsers, LuGamepad2, LuTarget, LuSearch, LuPlus, LuTrash2,
  LuEye, LuSettings, LuCircleX,
} from 'react-icons/lu';
import { AppShell, Card, Button, Badge, Loader, PageHead, Tabs, Stat, EmptyState } from '../components/ui';
import { getChartPalette, getColors, getShadow } from '../theme/tokens';
import { useTheme } from '../theme/ThemeContext';

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';

const SCHOOLS = ['ColégioObjetivo', 'Eseba', 'Associação21Down', 'Messias Pedreiro'];

const ADMIN_TABS = [
  { id: 'metrics', label: 'Métricas', icon: <LuChartColumn size={16} /> },
  { id: 'students', label: 'Alunos', icon: <LuUsers size={16} /> },
  { id: 'sessions', label: 'Sessões', icon: <LuTarget size={16} /> },
  { id: 'games', label: 'Jogos', icon: <LuGamepad2 size={16} /> },
  { id: 'personalization', label: 'Personalização', icon: <LuSettings size={16} /> },
];

export default function Admin() {
  const navigate = useNavigate();
  // Recharts recebe valores concretos — não lê CSS custom properties.
  const { theme } = useTheme();
  const colors = getColors(theme);
  const chartPalette = getChartPalette(theme);
  const chartTooltipStyle = {
    background: colors.surface,
    borderRadius: 12,
    border: `1px solid ${colors.line}`,
    boxShadow: getShadow(theme).lg,
    fontSize: 13,
    color: colors.ink[900],
  };
  const [user, loadingAuth] = useAuthState(auth);
  const [students, setStudents] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [gamesList, setGamesList] = useState([]);
  const [selectedSchool, setSelectedSchool] = useState(SCHOOLS[1]);
  const [selectedGame, setSelectedGame] = useState([]);
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

  // NOVOS ESTADOS DE METRICS VIEW E CUSTOM FIELDS
  const [metricsView, setMetricsView] = useState('platform'); // 'platform' ou 'game'
  const [customFields, setCustomFields] = useState([]);
  const [customMetrics, setCustomMetrics] = useState(null);
  const [eventsList, setEventsList] = useState([]); // lista de eventos do jogo
  const [selectedEvent, setSelectedEvent] = useState(''); // evento selecionado pelo usuário
  const [eventFields, setEventFields] = useState([]); // campos disponíveis do payload do evento


  // Handlers para custom fields
  const addCustomField = () => {
    setCustomFields(prev => [...prev, { field: '', operation: 'count', condition: null }]);
  };

  const updateCustomField = (idx, updates) => {
    setCustomFields(prev => prev.map((f, i) => i === idx ? { ...f, ...updates } : f));
  };

  const removeCustomField = (idx) => {
    setCustomFields(prev => prev.filter((_, i) => i !== idx));
  };

  // Fetch custom metrics
  const fetchCustomMetrics = async () => {
    if (!selectedGame) {
      toast.error('Selecione um jogo primeiro');
      return;
    }
    try {
      const token = await user.getIdToken();

      const payload = {
        game_id: selectedGame,
        operations: customFields.map(f => ({
          // garante que se o campo vier "correct", vira "payload.correct"
          field: f.field.includes('.') ? f.field : `payload.${f.field}`,
          operation: f.operation,
          condition: f.condition || null
        })),
        user_id: filterUser || null, // opcional
        date_from: filterDateFrom?.toISOString(),
        date_to: filterDateTo?.toISOString(),
        event_type: selectedEvent || null
      };

      const res = await fetch('/api/events/game/custom', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error('Erro ao buscar métricas custom');
      const data = await res.json();
      setCustomMetrics(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

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
    // if (activeTab === 'metrics') fetchMetrics();
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

  useEffect(() => {
    if (!selectedGame) return setEventsList([]);
    
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/events/game/${selectedGame}/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setEventsList(data.event_types || []);
      } catch(err) {
        toast.error('Erro ao carregar eventos do jogo');
      }
    })();
  }, [selectedGame]);

  useEffect(() => {
    if (!selectedEvent) return setEventFields([]);
    
    (async () => {
      try {
        const token = await user.getIdToken();
        const res = await fetch(`/api/events/game/${selectedGame}/fields?event_type=${selectedEvent}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        setEventFields(data.fields || []);
      } catch(err) {
        toast.error('Erro ao carregar campos do evento');
      }
    })();
  }, [selectedEvent]);

  // NOVA FUNÇÃO PARA BUSCAR MÉTRICAS
  const fetchMetrics = async () => {
    try {
      const token = await user.getIdToken();
      const url = new URL('/api/metrics/overview', window.location.origin);
      if (filterDateFrom) url.searchParams.set('date_from', filterDateFrom.toISOString());
      if (filterDateTo) url.searchParams.set('date_to', filterDateTo.toISOString());

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMetricsData(data);
    } catch(err) {
      toast.error('Erro ao carregar métricas');
    }
  };

  // Auth e papel já validados pelo PrivateRoute; user aqui só alimenta getIdToken até o split.
  if (loadingAuth) return <Loader label="Carregando painel administrativo…" />;

  return (
    <AppShell width="xl" back={-1}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuSettings size={13} /> Administração</>}
        title="Painel de administração"
        subtitle="Métricas de uso, alunos, sessões, jogos e configuração do estudo adaptativo."
      />

      <Tabs
        className="a2l-anim-in a2l-delay-1"
        value={activeTab}
        onChange={setActiveTab}
        items={ADMIN_TABS}
      />

      <div style={{ paddingTop: 26 }} className="a2l-anim-in a2l-delay-2">

      {/* ABA DE MÉTRICAS */}
      {activeTab === 'metrics' && (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
          <div>
            {/* Toggle visão */}
            <div style={{ marginBottom: 20 }}>
              <label className={`a2l-option ${metricsView === 'platform' ? 'a2l-option--checked' : ''}`} style={{ display: 'inline-flex', marginRight: 10 }}>
                <input
                  className="a2l-check"
                  type="radio"
                  checked={metricsView === 'platform'}
                  onChange={() => setMetricsView('platform')}
                />
                Plataforma
              </label>
              <label className={`a2l-option ${metricsView === 'game' ? 'a2l-option--checked' : ''}`} style={{ display: 'inline-flex' }}>
                <input
                  className="a2l-check"
                  type="radio"
                  checked={metricsView === 'game'}
                  onChange={() => setMetricsView('game')}
                />
                Jogos
              </label>
            </div>

            {/* ===== VISÃO PLATAFORMA ===== */}
            {metricsView === 'platform' && (
              <>
                {/* Filtros padrão */}
                <div className="a2l-filters">
                  <input
                    placeholder="User ID"
                    value={filterUser}
                    onChange={e => setFilterUser(e.target.value)}
                    className="a2l-input"
                  />
                  <input
                    placeholder="Tipo de Evento"
                    value={filterEvent}
                    onChange={e => setFilterEvent(e.target.value)}
                    className="a2l-input"
                  />
                  <DatePicker
                    value={filterDateFrom}
                    onChange={setFilterDateFrom}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <DatePicker
                    value={filterDateTo}
                    onChange={setFilterDateTo}
                    slotProps={{ textField: { size: 'small' } }}
                  />
                  <Button onClick={fetchMetrics} icon={<LuSearch size={16} />}>Aplicar</Button>
                </div>

                {/* Cards de resumo */}
                <div className="a2l-grid a2l-grid--stats" style={{ marginTop: 20 }}>
                  <Stat label="Usuários ativos" value={metricsData.users?.active_unique ?? 0} />
                  <Stat label="Novos usuários" tone="mint" value={metricsData.users?.new_users ?? 0} />
                  <Stat label="Retenção" tone="sun" value={`${((metricsData.users?.retention_rate ?? 0) * 100).toFixed(1)}%`} />
                  <Stat label="Logins" value={metricsData.logins?.total_logins ?? 0} />
                  <Stat label="Taxa de sucesso" tone="success" value={`${((metricsData.logins?.success_rate ?? 0) * 100).toFixed(1)}%`} />
                  <Stat label="Falhas de login" tone="danger" value={metricsData.logins?.failed_logins ?? 0} />
                  <Stat label="Eventos totais" value={metricsData.events?.total ?? 0} />
                </div>

                {/* Tendência de eventos por dia */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={styles.sectionTitle}>📅 Eventos por Dia</h3>
                  {metricsData.events?.trend?.length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={metricsData.events.trend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.lineSoft} vertical={false} />
                        <XAxis dataKey="date" tick={{ fill: colors.ink[500], fontSize: 12 }} tickLine={false} axisLine={{ stroke: colors.line }} />
                        <YAxis tick={{ fill: colors.ink[500], fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: colors.ink[700] }} labelStyle={{ color: colors.ink[900], fontWeight: 700 }} cursor={{ fill: colors.lineSoft }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: colors.ink[500] }} />
                        <Line type="monotone" dataKey="events" stroke={chartPalette[0]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : <EmptyState title="Sem dados de tendência" description="Ajuste o período e clique em Aplicar." />}
                </div>

                {/* Distribuição por tipo */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={styles.sectionTitle}>🗂️ Eventos por Tipo</h3>
                  {metricsData.events?.by_type && Object.keys(metricsData.events.by_type).length ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={Object.entries(metricsData.events.by_type).map(([type, count]) => ({ type, count }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke={colors.lineSoft} vertical={false} />
                        <XAxis dataKey="type" tick={{ fill: colors.ink[500], fontSize: 12 }} tickLine={false} axisLine={{ stroke: colors.line }} />
                        <YAxis tick={{ fill: colors.ink[500], fontSize: 12 }} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={chartTooltipStyle} itemStyle={{ color: colors.ink[700] }} labelStyle={{ color: colors.ink[900], fontWeight: 700 }} cursor={{ fill: colors.lineSoft }} />
                        <Legend wrapperStyle={{ fontSize: 12, color: colors.ink[500] }} />
                        <Bar dataKey="count" fill={chartPalette[1]} radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : <EmptyState title="Sem dados de eventos por tipo" />}
                </div>

                {/* Jogos mais jogados */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={styles.sectionTitle}>🎮 Jogos mais jogados</h3>
                  {metricsData.games?.most_played?.length ? (
                    <div className="a2l-table-wrap"><table className="a2l-table">
                      <thead>
                        <tr>
                          <th>Nome do Jogo</th>
                          <th>Eventos</th>
                          <th>Usuários Únicos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricsData.games.most_played.map(g => (
                          <tr key={g.game_id}>
                            <td>{g.game_name}</td>
                            <td>{g.events}</td>
                            <td>{g.unique_users}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  ) : <EmptyState title="Sem dados de jogos" />}
                </div>

                {/* Usuários mais ativos */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={styles.sectionTitle}>👤 Usuários mais ativos</h3>
                  {metricsData.users_activity?.top_active_users?.length ? (
                    <div className="a2l-table-wrap"><table className="a2l-table">
                      <thead>
                        <tr>
                          <th>Nome do Usuário</th>
                          <th>ID da Escola</th>
                          <th>Eventos</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricsData.users_activity.top_active_users.map(u => (
                          <tr key={u.user_id}>
                            <td>{u.user_name}</td>
                            <td>{u.school_id}</td>
                            <td>{u.events}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  ) : <EmptyState title="Sem dados de usuários" />}
                </div>

                {/* Usuários com falha de login */}
                <div style={{ marginTop: 32 }}>
                  <h3 style={styles.sectionTitle}>⚠️ Usuários com mais falhas de login</h3>
                  {metricsData.logins?.top_failed_users?.length ? (
                    <div className="a2l-table-wrap"><table className="a2l-table">
                      <thead>
                        <tr>
                          <th>User ID</th>
                          <th>Falhas</th>
                        </tr>
                      </thead>
                      <tbody>
                        {metricsData.logins.top_failed_users.map(u => (
                          <tr key={u.user_id}>
                            <td>{u.user_id}</td>
                            <td>{u.failures}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table></div>
                  ) : <EmptyState title="Nenhum usuário com falhas de login" />}
                </div>
              </>
            )}

            {/* ===== VISÃO JOGO ===== */}
            {metricsView === 'game' && (
              <>
                {/* Dropdown de jogos */}
                <div className="a2l-filters">
                  <select
                    value={selectedGame}
                    onChange={async e => {
                      const gameId = e.target.value;
                      setSelectedGame(gameId);
                      setSelectedEvent('');
                      setEventsList([]);
                      setEventFields([]);
                      setCustomFields([]);
                      setCustomMetrics(null);

                      if (!gameId) return;

                      // Buscar eventos do jogo
                      const token = await user.getIdToken();
                      const res = await fetch(`/api/events/game/${gameId}/list`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      const data = await res.json();
                      setEventsList(data.event_types);
                    }}
                    className="a2l-input"
                  >
                    <option value="">Selecione um jogo</option>
                    {gamesList.map(g => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dropdown de eventos */}
                {eventsList.length > 0 && (
                  <div className="a2l-filters">
                    <select
                      value={selectedEvent}
                      onChange={async e => {
                        const eventType = e.target.value;
                        setSelectedEvent(eventType);
                        setCustomFields([]);
                        setCustomMetrics(null);

                        if (!eventType) return;

                        // Buscar campos do evento
                        const token = await user.getIdToken();
                        const res = await fetch(`/api/events/game/${selectedGame}/fields?event_type=${eventType}`, {
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        const data = await res.json();
                        setEventFields(data.fields);
                      }}
                      className="a2l-input"
                    >
                      <option value="">Selecione um evento</option>
                      {eventsList.map(ev => (
                        <option key={ev} value={ev}>{ev}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Builder de análise */}
                {selectedEvent && (
                  <div style={{ marginTop: 16 }}>
                    <h3 style={styles.sectionTitle}>⚙️ Construir Análise</h3>
                    {customFields.map((f, idx) => (
                      <div key={idx} className="a2l-filters">
                        <select
                          value={f.field}
                          onChange={e => updateCustomField(idx, { field: e.target.value })}
                          className="a2l-input"
                        >
                          <option value="">Selecione campo</option>
                          {eventFields.map(field => (
                            <option key={field} value={field}>{field}</option>
                          ))}
                        </select>

                        <select
                          value={f.operation}
                          onChange={e => updateCustomField(idx, { operation: e.target.value })}
                          className="a2l-input"
                        >
                          <option value="count">Count</option>
                          <option value="sum">Sum</option>
                          <option value="avg">Average</option>
                          <option value="ratio">Ratio</option>
                        </select>

                        <input
                          placeholder="Condição (opcional)"
                          value={f.condition?.value ?? ''}
                          onChange={e => updateCustomField(idx, { condition: { value: e.target.value } })}
                          className="a2l-input"
                        />
                        <Button variant="secondary" onClick={() => removeCustomField(idx)} title="Remover campo">
                          <LuCircleX size={16} />
                        </Button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
                      <Button variant="secondary" onClick={addCustomField} icon={<LuPlus size={16} />}>
                        Adicionar campo
                      </Button>
                      <Button onClick={fetchCustomMetrics} icon={<LuChartColumn size={16} />}>
                        Calcular
                      </Button>
                    </div>
                  </div>
                )}

                {/* Resultados custom */}
                {customMetrics && (
                  <div style={{ marginTop: 24 }}>
                    <h3 style={styles.sectionTitle}>📊 Resultados da Análise</h3>

                    {Object.keys(customMetrics.results || {}).length > 0 ? (
                      <div className="a2l-grid a2l-grid--stats" style={{ marginTop: 16 }}>
                        {Object.entries(customMetrics.results).map(([key, value]) => (
                          <Stat
                            key={key}
                            label={key.replace(/_/g, ' ')}
                            value={
                              typeof value === 'number'
                                ? Number.isInteger(value)
                                  ? value
                                  : value.toFixed(2) // limita casas decimais
                                : value ?? '—'
                            }
                          />
                        ))}
                      </div>
                    ) : (
                      <EmptyState title="Nenhum resultado calculado" description="Adicione campos e clique em Calcular." />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </LocalizationProvider>
      )}

      {activeTab === 'students' && (
        <>
          <h3 style={styles.sectionTitle}>Filtro de Escola</h3>
          <Select
            classNamePrefix="a2l-select"
            options={SCHOOLS.map(s => ({ value: s, label: s }))}
            value={{ value: selectedSchool, label: selectedSchool }}
            onChange={opt => setSelectedSchool(opt.value)}
          />
          {loadingStudents ? (
            <Loader label="Carregando alunos…" />
          ) : (
            <div className="a2l-table-wrap"><table className="a2l-table">
              <thead>
                <tr><th>Nome</th><th>Email</th><th>Grupo</th></tr>
              </thead>
              <tbody>
                {students.map(s => (
                  <tr key={s.uid}>
                    <td>{s.name}</td>
                    <td>{s.mail}</td>
                    <td>{s.group || s.grade_level}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      )}

      {activeTab === 'sessions' && (
        <>
          <div className="a2l-filters">
            <Select
            classNamePrefix="a2l-select"
              options={SCHOOLS.map(s => ({ value: s, label: s }))}
              value={{ value: selectedSchool, label: selectedSchool }}
              onChange={opt => setSelectedSchool(opt.value)}
            />
            <Select
            classNamePrefix="a2l-select"
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
            <Loader label="Carregando sessões…" />
          ) : (
            <div className="a2l-table-wrap"><table className="a2l-table">
              <thead>
                <tr>
                  <th>Sessão</th>
                  <th>Jogo</th>
                  <th>Aluno</th>
                  <th>Criada em</th>
                  <th># Sessão</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map(s => (
                  <tr key={s.session_id}>
                    <td>{s.session_id}</td>
                    <td>{s.game_name}</td>
                    <td>{s.user_name}</td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td>{s.session_number}</td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      )}

      {activeTab === 'games' && (
        <>
          <div style={styles.headerRow}>
            <h3 style={styles.sectionTitle}>Lista de Jogos</h3>
            <Button icon={<LuPlus size={17} />} onClick={() => navigate('/admin/games/new')}>
              Novo jogo
            </Button>
          </div>
          {loadingGames ? (
            <Loader label="Carregando jogos…" />
          ) : (
            <div className="a2l-table-wrap"><table className="a2l-table">
              <thead>
                <tr>
                  <th>Ícone</th>
                  <th>ID</th>
                  <th>Nome</th>
                  <th>Warmup?</th>
                  <th>Opções?</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {gamesList.map(g => (
                  <tr key={g.id}>
                    <td>{g.iconUrl && <img src={g.iconUrl} alt="ícone" style={styles.icon} />}</td>
                    <td>{g.id}</td>
                    <td>{g.name}</td>
                    <td>{g.has_warmup ? 'Sim' : 'Não'}</td>
                    <td>{g.has_options ? 'Sim' : 'Não'}</td>
                    <td><div style={{ display: 'flex', gap: 8 }}>
                      <Button variant="secondary" size="sm" onClick={() => handleView(g.id)} title="Ver detalhes">
                        <LuEye size={15} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleDelete(g.id)}
                        title="Excluir jogo"
                        style={{ color: 'var(--a2l-danger)' }}
                      >
                        <LuTrash2 size={15} />
                      </Button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          )}
        </>
      )}

      {/* ABA DE PERSONALIZAÇÃO */}
      {activeTab === 'personalization' && <PersonalizationPanel />}
      </div>
    </AppShell>
  );
}

const styles = {
  sectionTitle: {
    fontFamily: 'var(--a2l-font-display)',
    fontSize: 'var(--a2l-text-lg)',
    fontWeight: 800,
    color: 'var(--a2l-ink-900)',
    margin: '0 0 14px',
  },
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    objectFit: 'cover',
    border: '1px solid var(--a2l-line)',
  },
};
