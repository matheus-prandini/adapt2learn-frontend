import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { LuChartColumn, LuUsers, LuGamepad2, LuTarget, LuSettings } from 'react-icons/lu'
import { listGamesWithIcons } from '../api/games'
import { SCHOOLS } from '../constants/schools'
import { AppShell, PageHead, Tabs } from '../components/ui'
import PersonalizationPanel from '../components/PersonalizationPanel'
import MetricsTab from './admin/MetricsTab'
import StudentsTab from './admin/StudentsTab'
import SessionsTab from './admin/SessionsTab'
import GamesTab from './admin/GamesTab'

const ADMIN_TABS = [
  { id: 'metrics', label: 'Métricas', icon: <LuChartColumn size={16} /> },
  { id: 'students', label: 'Alunos', icon: <LuUsers size={16} /> },
  { id: 'sessions', label: 'Sessões', icon: <LuTarget size={16} /> },
  { id: 'games', label: 'Jogos', icon: <LuGamepad2 size={16} /> },
  { id: 'personalization', label: 'Personalização', icon: <LuSettings size={16} /> },
]

/**
 * Casca do painel: abas, filtros compartilhados e a lista de jogos (usada por
 * três abas). Cada aba é dona dos próprios dados em pages/admin/*.
 *
 * Uma aba monta na primeira visita e depois só alterna com `hidden`: voltar a
 * ela não refaz requests nem perde filtros/seleções. Nada carrega antes de ser
 * visto pela primeira vez.
 */
export default function Admin() {
  const [activeTab, setActiveTab] = useState('metrics')
  const [visited, setVisited] = useState(() => new Set(['metrics']))

  const selectTab = id => {
    setActiveTab(id)
    setVisited(prev => (prev.has(id) ? prev : new Set(prev).add(id)))
  }

  const [selectedSchool, setSelectedSchool] = useState(SCHOOLS[1])
  const [sessionGameNames, setSessionGameNames] = useState([])

  const [games, setGames] = useState([])
  const [loadingGames, setLoadingGames] = useState(true)

  useEffect(() => {
    let cancelled = false
    listGamesWithIcons()
      .then(list => {
        if (!cancelled) setGames(list)
      })
      .catch(err => {
        if (!cancelled) toast.error(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoadingGames(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const panel = (id, node) =>
    visited.has(id) ? (
      <div key={id} hidden={activeTab !== id}>
        {node}
      </div>
    ) : null

  return (
    <AppShell width="xl" back={-1}>
      <PageHead
        className="a2l-anim-in"
        eyebrow={
          <>
            <LuSettings size={13} /> Administração
          </>
        }
        title="Painel de administração"
        subtitle="Métricas de uso, alunos, sessões, jogos e configuração do estudo adaptativo."
      />

      <Tabs
        className="a2l-anim-in a2l-delay-1"
        value={activeTab}
        onChange={selectTab}
        items={ADMIN_TABS}
      />

      <div style={{ paddingTop: 26 }} className="a2l-anim-in a2l-delay-2">
        {panel('metrics', <MetricsTab games={games} />)}
        {panel(
          'students',
          <StudentsTab school={selectedSchool} onSchoolChange={setSelectedSchool} />
        )}
        {panel(
          'sessions',
          <SessionsTab
            school={selectedSchool}
            onSchoolChange={setSelectedSchool}
            games={games}
            gameNames={sessionGameNames}
            onGameNamesChange={setSessionGameNames}
          />
        )}
        {panel(
          'games',
          <GamesTab
            games={games}
            loading={loadingGames}
            onRemoved={id => setGames(prev => prev.filter(g => g.id !== id))}
          />
        )}
        {panel('personalization', <PersonalizationPanel />)}
      </div>
    </AppShell>
  )
}
