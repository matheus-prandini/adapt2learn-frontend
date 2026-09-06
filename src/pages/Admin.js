import React, { useCallback, useEffect, useState } from 'react';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { LuChartColumn, LuUsers, LuGamepad2, LuTarget, LuSettings } from 'react-icons/lu';
import { storage } from '../firebase';
import { apiJson } from '../api/httpClient';
import { SCHOOLS } from '../constants/schools';
import { AppShell, PageHead, Tabs } from '../components/ui';
import PersonalizationPanel from '../components/PersonalizationPanel';
import MetricsTab from './admin/MetricsTab';
import StudentsTab from './admin/StudentsTab';
import SessionsTab from './admin/SessionsTab';
import GamesTab from './admin/GamesTab';

const ADMIN_TABS = [
  { id: 'metrics', label: 'Métricas', icon: <LuChartColumn size={16} /> },
  { id: 'students', label: 'Alunos', icon: <LuUsers size={16} /> },
  { id: 'sessions', label: 'Sessões', icon: <LuTarget size={16} /> },
  { id: 'games', label: 'Jogos', icon: <LuGamepad2 size={16} /> },
  { id: 'personalization', label: 'Personalização', icon: <LuSettings size={16} /> },
];

/**
 * Casca do painel: abas, filtros compartilhados e a lista de jogos (usada por
 * três abas). Cada aba é dona dos próprios dados em pages/admin/*.
 */
export default function Admin() {
  const [activeTab, setActiveTab] = useState('metrics');

  // Vivem aqui para sobreviver à troca de aba.
  const [selectedSchool, setSelectedSchool] = useState(SCHOOLS[1]);
  const [sessionGameNames, setSessionGameNames] = useState([]);

  const [games, setGames] = useState([]);
  const [loadingGames, setLoadingGames] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await apiJson('/games', undefined, 'Erro ao carregar jogos.');
        const withIcons = await Promise.all(
          raw.map(async g => {
            let iconUrl = '';
            try { iconUrl = await getDownloadURL(storageRef(storage, g.icon_url)); } catch { /* sem ícone */ }
            return { ...g, iconUrl };
          })
        );
        if (!cancelled) setGames(withIcons);
      } catch (err) {
        if (!cancelled) toast.error(err.message);
      } finally {
        if (!cancelled) setLoadingGames(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const removeGame = useCallback(id => setGames(prev => prev.filter(g => g.id !== id)), []);

  return (
    <AppShell width="xl" back={-1}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />

      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuSettings size={13} /> Administração</>}
        title="Painel de administração"
        subtitle="Métricas de uso, alunos, sessões, jogos e configuração do estudo adaptativo."
      />

      <Tabs className="a2l-anim-in a2l-delay-1" value={activeTab} onChange={setActiveTab} items={ADMIN_TABS} />

      <div style={{ paddingTop: 26 }} className="a2l-anim-in a2l-delay-2">
        {activeTab === 'metrics' && <MetricsTab games={games} />}
        {activeTab === 'students' && (
          <StudentsTab school={selectedSchool} onSchoolChange={setSelectedSchool} />
        )}
        {activeTab === 'sessions' && (
          <SessionsTab
            school={selectedSchool}
            onSchoolChange={setSelectedSchool}
            games={games}
            gameNames={sessionGameNames}
            onGameNamesChange={setSessionGameNames}
          />
        )}
        {activeTab === 'games' && <GamesTab games={games} loading={loadingGames} onRemoved={removeGame} />}
        {activeTab === 'personalization' && <PersonalizationPanel />}
      </div>
    </AppShell>
  );
}
