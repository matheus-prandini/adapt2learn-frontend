import React, { useEffect, useState } from 'react'
import Select from 'react-select'
import { toast } from 'react-toastify'
import { LuInbox } from 'react-icons/lu'
import { apiJson } from '../../api/httpClient'
import { Card, EmptyState, Loader } from '../../components/ui'
import SchoolSelect from './SchoolSelect'
import SectionTitle from './SectionTitle'

export default function SessionsTab({ school, onSchoolChange, games, gameNames, onGameNamesChange }) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!school) {
      setSessions([])
      return undefined
    }
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const params = new URLSearchParams({ school_id: school })
        if (gameNames.length) params.set('game_names', gameNames.join(','))
        const data = await apiJson(`/sessions?${params}`, undefined, 'Erro ao carregar sessões.')
        if (!cancelled) setSessions(Array.isArray(data) ? data : [])
      } catch (err) {
        if (!cancelled) toast.error(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [school, gameNames])

  const gameOptions = games.map(g => ({ value: g.name, label: g.name }))

  return (
    <>
      <SectionTitle>Sessões jogadas</SectionTitle>
      <div className="a2l-filters">
        <SchoolSelect value={school} onChange={onSchoolChange} />
        <Select
          classNamePrefix="a2l-select"
          isMulti
          options={gameOptions}
          value={gameOptions.filter(o => gameNames.includes(o.value))}
          onChange={opts => onGameNamesChange((opts || []).map(o => o.value))}
          placeholder="Filtrar por jogo"
          aria-label="Filtrar por jogo"
          styles={{ container: base => ({ ...base, minWidth: 240 }) }}
        />
      </div>

      {loading ? (
        <Loader label="Carregando sessões…" />
      ) : sessions.length === 0 ? (
        <Card quiet>
          <EmptyState icon={<LuInbox size={22} />} title="Nenhuma sessão para este filtro" />
        </Card>
      ) : (
        <div className="a2l-table-wrap">
          <table className="a2l-table">
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
                  <td style={{ fontFamily: 'var(--a2l-font-mono)', fontSize: 'var(--a2l-text-sm)' }}>{s.session_id}</td>
                  <td>{s.game_name}</td>
                  <td>{s.user_name}</td>
                  <td>{new Date(s.created_at).toLocaleString('pt-BR')}</td>
                  <td>{s.session_number}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  )
}
