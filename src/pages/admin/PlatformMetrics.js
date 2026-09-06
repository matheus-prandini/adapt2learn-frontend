import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { apiJson } from '../../api/httpClient'
import { Stat, EmptyState, Loader } from '../../components/ui'
import { useChartTheme } from './chartTheme'
import SectionTitle from './SectionTitle'

function SimpleTable({ columns, rows, rowKey, empty }) {
  if (!rows?.length) return <EmptyState title={empty} />
  return (
    <div className="a2l-table-wrap">
      <table className="a2l-table">
        <thead><tr>{columns.map(c => <th key={c.key}>{c.label}</th>)}</tr></thead>
        <tbody>
          {rows.map(r => (
            <tr key={r[rowKey]}>{columns.map(c => <td key={c.key}>{r[c.key]}</td>)}</tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * Visão geral da plataforma para o período aplicado (`range`).
 * Recarrega sempre que `range` muda — e uma vez ao montar.
 */
export default function PlatformMetrics({ range }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const chart = useChartTheme()

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const params = new URLSearchParams()
        if (range.from) params.set('date_from', range.from.toISOString())
        if (range.to) params.set('date_to', range.to.toISOString())
        const result = await apiJson(`/metrics/overview?${params}`, undefined, 'Erro ao carregar métricas.')
        if (!cancelled) setData(result || {})
      } catch (err) {
        if (!cancelled) toast.error(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [range])

  if (loading && !data) return <Loader label="Carregando métricas…" />

  const d = data || {}
  const byType = d.events?.by_type
    ? Object.entries(d.events.by_type).map(([type, count]) => ({ type, count }))
    : []
  const pct = v => `${((v ?? 0) * 100).toFixed(1)}%`

  return (
    <div className="a2l-stack" style={{ gap: 32, opacity: loading ? 0.6 : 1, transition: 'opacity 150ms' }}>
      <div className="a2l-grid a2l-grid--stats">
        <Stat label="Usuários ativos" value={d.users?.active_unique ?? 0} />
        <Stat label="Novos usuários" tone="mint" value={d.users?.new_users ?? 0} />
        <Stat label="Retenção" tone="sun" value={pct(d.users?.retention_rate)} />
        <Stat label="Logins" value={d.logins?.total_logins ?? 0} />
        <Stat label="Taxa de sucesso" tone="success" value={pct(d.logins?.success_rate)} />
        <Stat label="Falhas de login" tone="danger" value={d.logins?.failed_logins ?? 0} />
        <Stat label="Eventos totais" value={d.events?.total ?? 0} />
      </div>

      <section>
        <SectionTitle>Eventos por dia</SectionTitle>
        {d.events?.trend?.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={d.events.trend}>
              <CartesianGrid {...chart.grid} />
              <XAxis dataKey="date" {...chart.xAxis} />
              <YAxis {...chart.yAxis} />
              <Tooltip {...chart.tooltip} />
              <Legend {...chart.legend} />
              <Line type="monotone" dataKey="events" stroke={chart.palette[0]} strokeWidth={2.5} dot={{ r: 3 }} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="Sem dados de tendência" description="Ajuste o período e clique em Aplicar." />
        )}
      </section>

      <section>
        <SectionTitle>Eventos por tipo</SectionTitle>
        {byType.length ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byType}>
              <CartesianGrid {...chart.grid} />
              <XAxis dataKey="type" {...chart.xAxis} />
              <YAxis {...chart.yAxis} />
              <Tooltip {...chart.tooltip} />
              <Legend {...chart.legend} />
              <Bar dataKey="count" fill={chart.palette[1]} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState title="Sem dados de eventos por tipo" />
        )}
      </section>

      <section>
        <SectionTitle>Jogos mais jogados</SectionTitle>
        <SimpleTable
          rowKey="game_id"
          rows={d.games?.most_played}
          empty="Sem dados de jogos"
          columns={[
            { key: 'game_name', label: 'Jogo' },
            { key: 'events', label: 'Eventos' },
            { key: 'unique_users', label: 'Usuários únicos' },
          ]}
        />
      </section>

      <section>
        <SectionTitle>Usuários mais ativos</SectionTitle>
        <SimpleTable
          rowKey="user_id"
          rows={d.users_activity?.top_active_users}
          empty="Sem dados de usuários"
          columns={[
            { key: 'user_name', label: 'Usuário' },
            { key: 'school_id', label: 'Escola' },
            { key: 'events', label: 'Eventos' },
          ]}
        />
      </section>

      <section>
        <SectionTitle>Usuários com mais falhas de login</SectionTitle>
        <SimpleTable
          rowKey="user_id"
          rows={d.logins?.top_failed_users}
          empty="Nenhum usuário com falhas de login"
          columns={[
            { key: 'user_id', label: 'User ID' },
            { key: 'failures', label: 'Falhas' },
          ]}
        />
      </section>
    </div>
  )
}
