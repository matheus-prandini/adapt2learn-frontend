import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { LuPlus, LuCircleX, LuChartColumn } from 'react-icons/lu'
import { apiJson, jsonBody } from '../../api/httpClient'
import { Button, Field, Stat, EmptyState, Card } from '../../components/ui'
import SectionTitle from './SectionTitle'

const OPERATIONS = [
  { value: 'count', label: 'Contagem' },
  { value: 'sum', label: 'Soma' },
  { value: 'avg', label: 'Média' },
  { value: 'ratio', label: 'Proporção' },
]

const newField = () => ({ id: crypto.randomUUID(), field: '', operation: 'count', condition: null })

/**
 * Métricas customizadas por jogo: escolhe jogo → evento → campos do payload →
 * operação. Cada nível reseta os seguintes; a busca de eventos/campos vive em
 * efeitos com cancelamento (antes era duplicada entre onChange e useEffect e
 * disparava no mount com o jogo vazio).
 */
export default function GameMetricsBuilder({ games, range }) {
  const [gameId, setGameId] = useState('')
  const [eventType, setEventType] = useState('')
  const [userId, setUserId] = useState('')
  const [events, setEvents] = useState([])
  const [fields, setFields] = useState([])
  const [rows, setRows] = useState([])
  const [results, setResults] = useState(null)
  const [computing, setComputing] = useState(false)

  useEffect(() => {
    if (!gameId) {
      setEvents([])
      return undefined
    }
    let cancelled = false
    ;(async () => {
      try {
        const data = await apiJson(
          `/events/game/${gameId}/list`,
          undefined,
          'Erro ao carregar eventos do jogo.'
        )
        if (!cancelled) setEvents(data?.event_types || [])
      } catch (err) {
        if (!cancelled) toast.error(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameId])

  useEffect(() => {
    if (!gameId || !eventType) {
      setFields([])
      return undefined
    }
    let cancelled = false
    ;(async () => {
      try {
        const qs = new URLSearchParams({ event_type: eventType })
        const data = await apiJson(
          `/events/game/${gameId}/fields?${qs}`,
          undefined,
          'Erro ao carregar campos do evento.'
        )
        if (!cancelled) setFields(data?.fields || [])
      } catch (err) {
        if (!cancelled) toast.error(err.message)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [gameId, eventType])

  const onGameChange = id => {
    setGameId(id)
    setEventType('')
    setRows([])
    setResults(null)
  }

  const onEventChange = ev => {
    setEventType(ev)
    setRows([])
    setResults(null)
  }

  const updateRow = (id, patch) =>
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)))
  const removeRow = id => setRows(prev => prev.filter(r => r.id !== id))

  const compute = async () => {
    if (!gameId) {
      toast.error('Selecione um jogo primeiro')
      return
    }
    setComputing(true)
    try {
      const data = await apiJson(
        '/events/game/custom',
        {
          method: 'POST',
          ...jsonBody({
            game_id: gameId,
            operations: rows.map(r => ({
              // "correct" vira "payload.correct"; caminhos já qualificados passam intactos.
              field: r.field.includes('.') ? r.field : `payload.${r.field}`,
              operation: r.operation,
              condition: r.condition || null,
            })),
            user_id: userId || null,
            date_from: range.from?.toISOString(),
            date_to: range.to?.toISOString(),
            event_type: eventType || null,
          }),
        },
        'Erro ao calcular métricas.'
      )
      setResults(data)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setComputing(false)
    }
  }

  const formatValue = v =>
    typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : (v ?? '—')

  return (
    <div className="a2l-stack" style={{ gap: 24 }}>
      <div className="a2l-grid a2l-grid--2">
        <Field label="Jogo">
          <select value={gameId} onChange={e => onGameChange(e.target.value)}>
            <option value="">Selecione um jogo</option>
            {games.map(g => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Evento" hint={!gameId ? 'Escolha o jogo primeiro.' : undefined}>
          <select
            value={eventType}
            onChange={e => onEventChange(e.target.value)}
            disabled={!gameId || events.length === 0}
          >
            <option value="">
              {gameId && events.length === 0 ? 'Nenhum evento registrado' : 'Selecione um evento'}
            </option>
            {events.map(ev => (
              <option key={ev} value={ev}>
                {ev}
              </option>
            ))}
          </select>
        </Field>

        <Field label="User ID" optional hint="Restringe o cálculo a um único aluno.">
          <input
            value={userId}
            onChange={e => setUserId(e.target.value)}
            placeholder="uid do aluno"
          />
        </Field>
      </div>

      {eventType && (
        <section>
          <SectionTitle
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={<LuPlus size={15} />}
                onClick={() => setRows(prev => [...prev, newField()])}
              >
                Adicionar campo
              </Button>
            }
          >
            Construir análise
          </SectionTitle>

          {rows.length === 0 ? (
            <Card quiet>
              <EmptyState
                title="Nenhum campo ainda"
                description="Adicione um campo do payload e escolha a operação."
              />
            </Card>
          ) : (
            <div className="a2l-stack" style={{ gap: 10 }}>
              {rows.map(r => (
                <div key={r.id} className="a2l-filters" style={{ marginBottom: 0 }}>
                  <select
                    className="a2l-input"
                    value={r.field}
                    onChange={e => updateRow(r.id, { field: e.target.value })}
                  >
                    <option value="">Selecione campo</option>
                    {fields.map(f => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                  <select
                    className="a2l-input"
                    value={r.operation}
                    onChange={e => updateRow(r.id, { operation: e.target.value })}
                  >
                    {OPERATIONS.map(o => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="a2l-input"
                    placeholder="Condição (opcional)"
                    value={r.condition?.value ?? ''}
                    onChange={e =>
                      updateRow(r.id, {
                        condition: e.target.value ? { value: e.target.value } : null,
                      })
                    }
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeRow(r.id)}
                    title="Remover campo"
                    aria-label="Remover campo"
                  >
                    <LuCircleX size={16} />
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button
            style={{ marginTop: 14 }}
            icon={<LuChartColumn size={16} />}
            onClick={compute}
            loading={computing}
            disabled={computing || rows.length === 0}
          >
            Calcular
          </Button>
        </section>
      )}

      {results && (
        <section>
          <SectionTitle>Resultados</SectionTitle>
          {Object.keys(results.results || {}).length > 0 ? (
            <div className="a2l-grid a2l-grid--stats">
              {Object.entries(results.results).map(([key, value]) => (
                <Stat key={key} label={key.replace(/_/g, ' ')} value={formatValue(value)} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Nenhum resultado calculado"
              description="Adicione campos e clique em Calcular."
            />
          )}
        </section>
      )}
    </div>
  )
}
