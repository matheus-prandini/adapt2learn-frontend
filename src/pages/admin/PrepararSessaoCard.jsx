import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { LuBrain, LuLibraryBig, LuPlay } from 'react-icons/lu'
import { getBankHealth, precomputeWeights } from '../../api/studyApi'
import { Alert, Badge, Button, Card, Field, Stat } from '../../components/ui'
import SectionTitle from './SectionTitle'

/**
 * Preparação da sessão: calcular o `W` e conferir o banco de itens.
 *
 * As duas coisas são pré-requisito da sessão adaptativa, e nenhuma é óbvia pela
 * tela antes de existir este cartão:
 *
 * - **sem `W` vigente o aluno recebe o comportamento de sempre.** A adaptação
 *   não "liga sozinha" quando a onda é ativada: ativar define o braço, e o `W`
 *   precisa ser calculado. Servir adaptação sem `W` seria inventar uma política
 *   que não está registrada em lugar nenhum, então o backend prefere não servir.
 * - **banda sem item nunca é servida**, por mais peso que `W` lhe dê. O sorteio
 *   reamostra para as outras bandas e nada avisa — a não ser este relatório.
 */

const ONDAS = [1, 2]

export default function PrepararSessaoCard({ domains = [], schools = [] }) {
  const [onda, setOnda] = useState('1')
  const [dominio, setDominio] = useState('')
  const [calculando, setCalculando] = useState(false)
  const [relatorio, setRelatorio] = useState(null)

  const [school, setSchool] = useState(schools[0] || '')
  const [discipline, setDiscipline] = useState('Português')
  const [subarea, setSubarea] = useState('Alfabetização')
  const [conferindo, setConferindo] = useState(false)
  const [banco, setBanco] = useState(null)

  const calcular = async () => {
    setCalculando(true)
    setRelatorio(null)
    try {
      const r = await precomputeWeights({
        onda: Number(onda),
        domain: dominio || undefined,
      })
      setRelatorio(r)
      const erros = r.by_status?.error || 0
      if (erros > 0) toast.warn(`${erros} participante(s) falharam — veja a tabela.`)
      else toast.success(`W calculado para ${r.n} participante(s).`)
    } catch (err) {
      toast.error(err.message || 'Falha no pré-cálculo.')
    } finally {
      setCalculando(false)
    }
  }

  const conferir = async () => {
    setConferindo(true)
    setBanco(null)
    try {
      setBanco(
        await getBankHealth({
          domain: dominio || domains[0],
          school_id: school,
          discipline,
          subarea,
        })
      )
    } catch (err) {
      toast.error(err.message || 'Falha ao conferir o banco.')
    } finally {
      setConferindo(false)
    }
  }

  return (
    <Card>
      <SectionTitle>Preparar a sessão</SectionTitle>

      <Alert tone="warning" style={{ marginBottom: 18 }}>
        Ativar a onda define o <strong>braço</strong>; ela não calcula o vetor. Enquanto um
        participante não tiver <strong>W vigente</strong>, ele recebe o comportamento de sempre — o
        backend não serve adaptação que não consiga descrever depois. Rode o pré-cálculo{' '}
        <strong>antes</strong> de cada sessão.
      </Alert>

      {/* ---------------------------------------------- pré-cálculo de W */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
        <span className="a2l-icon-chip a2l-icon-chip--solid">
          <LuBrain size={18} />
        </span>
        <div>
          <h4 style={{ fontSize: 'var(--a2l-text-md)' }}>Pré-calcular W</h4>
          <p className="a2l-hint" style={{ marginTop: 4 }}>
            Atualiza o modelo do aluno a partir dos eventos e infere o vetor de relevância —{' '}
            <strong>uma chamada de LLM por participante</strong>. Leva alguns minutos e a página
            precisa ficar aberta.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="Onda" style={{ minWidth: 120 }}>
          <select value={onda} onChange={e => setOnda(e.target.value)}>
            {ONDAS.map(o => (
              <option key={o} value={o}>
                Onda {o}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Domínio" optional hint="Vazio = os dois" style={{ minWidth: 160 }}>
          <select value={dominio} onChange={e => setDominio(e.target.value)}>
            <option value="">todos</option>
            {domains.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>
        <Button onClick={calcular} loading={calculando} icon={<LuPlay size={16} />}>
          {calculando ? 'Calculando… (minutos)' : 'Calcular W'}
        </Button>
      </div>

      {relatorio && (
        <div className="a2l-anim-in" style={{ marginTop: 18 }}>
          <div className="a2l-grid a2l-grid--stats" style={{ marginBottom: 14 }}>
            <Stat label="Participantes" value={relatorio.n} />
            <Stat label="OK" tone="success" value={relatorio.by_status?.ok ?? 0} />
            <Stat label="Falhas" tone="danger" value={relatorio.by_status?.error ?? 0} />
          </div>

          {relatorio.results?.length > 0 && (
            <div className="a2l-table-wrap">
              <table className="a2l-table">
                <thead>
                  <tr>
                    <th>Participante</th>
                    <th>Domínio</th>
                    <th>Status</th>
                    <th>Origem do W</th>
                    <th>Tentativas</th>
                    <th>Confiança</th>
                    <th>Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {relatorio.results.map(r => (
                    <tr key={`${r.uid}-${r.domain}`}>
                      <td style={{ fontWeight: 600 }}>{r.participant_code || r.uid}</td>
                      <td>{r.domain}</td>
                      <td>
                        <Badge
                          tone={
                            r.status === 'ok'
                              ? 'success'
                              : r.status === 'error'
                                ? 'danger'
                                : 'neutral'
                          }
                        >
                          {r.status}
                        </Badge>
                      </td>
                      <td>
                        {/* `heuristic` significa que o LLM falhou e a heurística
                            assumiu — a análise precisa poder filtrar por isso. */}
                        {r.source === 'heuristic' ? (
                          <Badge tone="sun" title="O LLM falhou; serviu a linha de base">
                            heurística
                          </Badge>
                        ) : (
                          <span className="a2l-hint">{r.source || '—'}</span>
                        )}
                      </td>
                      <td>{r.attempts ?? '—'}</td>
                      <td>
                        {r.confidence != null ? (
                          <span
                            className="a2l-hint"
                            title="Abaixo de 1, o vetor é encolhido em direção ao uniforme"
                          >
                            {r.confidence}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="a2l-hint">
                        {r.error || (r.llm_violations?.length ? r.llm_violations.join('; ') : '—')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ------------------------------------------- saúde do banco */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          alignItems: 'flex-start',
          margin: '26px 0 14px',
          paddingTop: 22,
          borderTop: '1px solid var(--a2l-line)',
        }}
      >
        <span className="a2l-icon-chip a2l-icon-chip--mint">
          <LuLibraryBig size={18} />
        </span>
        <div>
          <h4 style={{ fontSize: 'var(--a2l-text-md)' }}>Conferir o banco de itens</h4>
          <p className="a2l-hint" style={{ marginTop: 4 }}>
            Quantas palavras cada banda tem, e quais a máquina não conseguiu classificar —{' '}
            <strong>com o motivo</strong>. É o relatório de curadoria das listas.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <Field label="Escola" style={{ minWidth: 190 }}>
          <select value={school} onChange={e => setSchool(e.target.value)}>
            {schools.map(s => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Disciplina" style={{ minWidth: 150 }}>
          <input value={discipline} onChange={e => setDiscipline(e.target.value)} />
        </Field>
        <Field label="Subárea" style={{ minWidth: 150 }}>
          <input value={subarea} onChange={e => setSubarea(e.target.value)} />
        </Field>
        <Button variant="accent" onClick={conferir} loading={conferindo}>
          {conferindo ? 'Conferindo…' : 'Conferir banco'}
        </Button>
      </div>

      {banco && (
        <div className="a2l-anim-in" style={{ marginTop: 18 }}>
          {!banco.supported && (
            <Alert tone="warning" style={{ marginBottom: 14 }}>
              O domínio <code>{banco.domain}</code> ainda não tem fonte de itens ligada. Os itens
              precisam trazer os atributos em <code>pedagogical.igplato</code>, que é a geração que
              sabe carimbar. Enquanto isso, este domínio serve o comportamento de sempre.
            </Alert>
          )}

          <div className="a2l-grid a2l-grid--stats" style={{ marginBottom: 14 }}>
            <Stat label="Itens classificados" value={banco.n_items} />
            <Stat label="Da sondagem" tone="neutral" value={banco.n_probe} foot="held-out" />
            <Stat
              label="Não classificados"
              tone={banco.n_rejected > 0 ? 'sun' : 'neutral'}
              value={banco.n_rejected}
            />
            <Stat
              label="Bandas vazias"
              tone={banco.empty_skills?.length ? 'danger' : 'success'}
              value={banco.empty_skills?.length ?? 0}
            />
          </div>

          {banco.empty_skills?.length > 0 && (
            <Alert tone="error" style={{ marginBottom: 14 }}>
              <strong>Banda sem item nunca é servida</strong>, por mais peso que W lhe dê — o
              sorteio reamostra para as outras e nada avisa. Vazias:{' '}
              <code>{banco.empty_skills.join(', ')}</code>.
            </Alert>
          )}

          <div className="a2l-table-wrap">
            <table className="a2l-table">
              <thead>
                <tr>
                  <th>Banda</th>
                  <th>Itens</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(banco.by_skill || {}).map(([banda, n]) => (
                  <tr key={banda}>
                    <td style={{ fontWeight: 600 }}>{banda}</td>
                    <td>
                      {n === 0 ? (
                        <Badge tone="danger">vazia</Badge>
                      ) : (
                        <Badge tone="success">{n}</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {Object.keys(banco.rejected || {}).length > 0 && (
            <>
              <p className="a2l-hint" style={{ margin: '16px 0 8px' }}>
                Não classificadas (até 50):
              </p>
              <pre className="a2l-pre">
                {Object.entries(banco.rejected)
                  .map(([id, motivo]) => `${id}: ${motivo}`)
                  .join('\n')}
              </pre>
            </>
          )}
        </div>
      )}
    </Card>
  )
}
