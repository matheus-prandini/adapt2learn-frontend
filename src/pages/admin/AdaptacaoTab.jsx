import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'react-toastify'
import {
  LuActivity,
  LuCheck,
  LuHistory,
  LuPencil,
  LuPower,
  LuPowerOff,
  LuRefreshCw,
  LuUsers,
  LuX,
} from 'react-icons/lu'
import {
  activateWave,
  deactivateWave,
  getAudit,
  getParticipants,
  STUDY_ERROR,
  updateParticipant,
} from '../../api/studyApi'
import { SCHOOLS } from '../../constants/schools'
import { Alert, Badge, Button, Card, EmptyState, Loader, Stat } from '../../components/ui'
import ActivationDialog from './ActivationDialog'
import AdicionarParticipante from './AdicionarParticipante'
import AlocacaoCard from './AlocacaoCard'
import BancoDePalavrasCard from './BancoDePalavrasCard'
import PrepararSessaoCard from './PrepararSessaoCard'
import SectionTitle from './SectionTitle'

/**
 * Aba de adaptação: o plano de controle do estudo da Associação 21.
 *
 * É por aqui que a adaptação de uma onda é ligada no dia da entrada em
 * intervenção — sem deploy, sem console do Firestore, e com registro de quem e
 * quando. A trilha de auditoria que esta tela mostra é a evidência de
 * fidelidade da manipulação que vai para o artigo.
 *
 * **As regras do experimento não moram aqui.** Confirmação digitada,
 * idempotência, recusa fora do calendário e recusa de ativar o domínio de
 * controle de alguém são todas verificadas pela API. Esta tela torna cada uma
 * visível e difícil de acionar por engano, mas se um caminho daqui sumir, nada
 * se afrouxa — o que é o teste de que a regra está no lugar certo.
 *
 * Uma ausência é deliberada: **não existe controle que ligue a adaptação nos
 * dois domínios do mesmo participante**. Cada participante tem um domínio
 * tratado, e o outro é a série de controle interna dele; a ativação é sempre
 * por `(onda, domínio)` e só alcança quem trata aquele domínio.
 */

const ACOES = {
  activate: { tom: 'primary', icone: <LuPower size={15} /> },
  deactivate: { tom: 'danger', icone: <LuPowerOff size={15} /> },
}

const ONDAS = [1, 2]

function dataCurta(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso).slice(0, 10) : d.toLocaleDateString('pt-BR')
}

function horaCompleta(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleString('pt-BR')
}

/** Chip de estado de um domínio para um participante. */
function ChipBraco({ arm, tratado, desde }) {
  if (!tratado) {
    return (
      <Badge tone="neutral" title="Domínio de controle interno deste participante">
        controle
      </Badge>
    )
  }
  return arm === 'adaptive' ? (
    <Badge tone="success" title={`Adaptativo desde ${dataCurta(desde)}`}>
      adaptativo
    </Badge>
  ) : (
    <Badge tone="sun" title="Domínio tratado, ainda em linha de base">
      aguardando
    </Badge>
  )
}

export default function AdaptacaoTab() {
  const [carregando, setCarregando] = useState(true)
  const [dados, setDados] = useState(null) // { config, participants }
  const [trilha, setTrilha] = useState([])
  const [atualizando, setAtualizando] = useState(false)

  const [dialogo, setDialogo] = useState(null) // { action, onda, domain, preview, error, busy }
  const [editando, setEditando] = useState(null) // { uid, onda, treated_domain, slot, monitor }
  const [salvando, setSalvando] = useState(false)

  // Memoizados porque alimentam o `useMemo` das contagens: sem isto, o fallback
  // `|| []` cria um array novo a cada render e o cálculo refaz sempre.
  const dominios = useMemo(() => dados?.config?.domains || [], [dados])
  const participantes = useMemo(() => dados?.participants || [], [dados])

  const carregar = useCallback(async ({ silencioso = false } = {}) => {
    if (!silencioso) setCarregando(true)
    setAtualizando(true)
    try {
      const [roster, auditoria] = await Promise.all([getParticipants(), getAudit(100)])
      setDados(roster)
      setTrilha(auditoria?.items || [])
    } catch (err) {
      toast.error(err.message || 'Falha ao carregar o plano de controle.')
    } finally {
      setCarregando(false)
      setAtualizando(false)
    }
  }, [])

  useEffect(() => {
    carregar()
  }, [carregar])

  /** Contagens por (onda, domínio) — a base dos cartões de ativação. */
  const porOndaEDominio = useMemo(() => {
    const mapa = {}
    for (const onda of ONDAS) {
      for (const dominio of dominios) {
        const alvo = participantes.filter(
          p => p.onda === onda && p.treated_domain === dominio && p.active !== false
        )
        mapa[`${onda}:${dominio}`] = {
          total: alvo.length,
          ativos: alvo.filter(p => p.arms?.[dominio] === 'adaptive').length,
        }
      }
    }
    return mapa
  }, [participantes, dominios])

  const semDominioTratado = participantes.filter(p => !p.treated_domain).length
  const semOnda = participantes.filter(p => !p.onda).length

  // ---------------------------------------------------------------- ativação

  const abrirDialogo = async (action, onda, domain) => {
    setDialogo({ action, onda, domain, preview: null, error: null, busy: true })
    try {
      // O preview vem da própria API (dry-run). Contar aqui criaria uma segunda
      // versão da verdade, que divergiria em silêncio da que será aplicada.
      const chamada = action === 'activate' ? activateWave : deactivateWave
      const preview = await chamada({ onda, domain, dry_run: true })
      setDialogo(d => (d ? { ...d, preview, busy: false } : d))
    } catch (err) {
      toast.error(err.message || 'Falha ao montar o preview da ação.')
      setDialogo(null)
    }
  }

  const confirmar = async (frase, reconhece) => {
    if (!dialogo) return
    const { action, onda, domain } = dialogo
    setDialogo(d => ({ ...d, busy: true, error: null }))
    try {
      const chamada = action === 'activate' ? activateWave : deactivateWave
      const resultado = await chamada({
        onda,
        domain,
        confirmation: frase,
        acknowledge_off_calendar: reconhece,
      })
      setDialogo(null)
      toast.success(
        `${action === 'activate' ? 'Ativação' : 'Desativação'} aplicada: ` +
          `${resultado.n_to_change} participante(s) da onda ${onda} em ${domain}.`
      )
      await carregar({ silencioso: true })
    } catch (err) {
      // 428 (frase) e 409 (calendário / domínio de controle) mantêm o diálogo
      // aberto: são recusas que o operador resolve ali mesmo.
      setDialogo(d => (d ? { ...d, busy: false, error: err } : d))
      if (err.status !== STUDY_ERROR.NEEDS_CONFIRMATION && err.status !== STUDY_ERROR.CONFLICT) {
        toast.error(err.message || 'Falha ao aplicar a ação.')
      }
    }
  }

  // ------------------------------------------------------------ participante

  const salvarParticipante = async () => {
    if (!editando) return
    setSalvando(true)
    try {
      const { uid, ...campos } = editando
      // `arms` e `adaptive_since` NÃO são enviados: quem liga a adaptação é a
      // ativação, com confirmação digitada. O backend também os recusa aqui.
      await updateParticipant(uid, {
        onda: campos.onda ? Number(campos.onda) : null,
        treated_domain: campos.treated_domain || null,
        slot: campos.slot || null,
        monitor: campos.monitor || null,
      })
      setEditando(null)
      toast.success('Participante atualizado.')
      await carregar({ silencioso: true })
    } catch (err) {
      toast.error(err.message || 'Falha ao salvar o participante.')
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <Loader label="Carregando o plano de controle…" />

  const fase = dados?.config?.phase
  const nAdaptativos = participantes.filter(p =>
    dominios.some(d => p.arms?.[d] === 'adaptive')
  ).length

  return (
    <div className="a2l-stack" style={{ gap: 20, textAlign: 'left' }}>
      {/* ------------------------------------------------ estado do estudo */}
      <Card hero>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <span className="a2l-icon-chip a2l-icon-chip--solid">
            <LuActivity size={19} />
          </span>
          <div style={{ flex: 1 }}>
            <h3 style={{ fontSize: 'var(--a2l-text-lg)' }}>Estudo adaptativo</h3>
            <p className="a2l-hint" style={{ marginTop: 4 }}>
              {dados?.config?.study_id} · desenho intrassujeitos: cada participante tem{' '}
              <strong>um domínio tratado</strong>, e o outro é a série de controle interna dele.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => carregar({ silencioso: true })}
            loading={atualizando}
            icon={<LuRefreshCw size={15} />}
          >
            Atualizar
          </Button>
        </div>

        <div className="a2l-grid a2l-grid--stats">
          <Stat label="Participantes" value={participantes.length} />
          <Stat
            label="Com adaptação ligada"
            tone="success"
            value={nAdaptativos}
            foot={`de ${participantes.length}`}
          />
          <Stat
            label="Fase"
            tone={fase === 'intervention' ? 'mint' : 'neutral'}
            value={fase === 'intervention' ? 'Intervenção' : 'Linha de base'}
          />
          <Stat label="Domínios" tone="neutral" value={dominios.join(' · ') || '—'} />
        </div>

        {(semDominioTratado > 0 || semOnda > 0) && (
          <Alert tone="warning" style={{ marginTop: 16 }}>
            {semOnda > 0 && (
              <>
                <strong>{semOnda}</strong> participante(s) sem onda definida.{' '}
              </>
            )}
            {semDominioTratado > 0 && (
              <>
                <strong>{semDominioTratado}</strong> sem domínio tratado.{' '}
              </>
            )}
            Quem não tem onda e domínio tratado <strong>não entra na ativação</strong> — defina na
            tabela abaixo antes do dia da onda.
          </Alert>
        )}
      </Card>

      {/* ------------------------------------------------------- ativação */}
      <Card>
        <SectionTitle>Ativação por onda e domínio</SectionTitle>

        <Alert tone="info" style={{ marginBottom: 16 }}>
          A ativação é sempre por <strong>(onda, domínio)</strong> e só alcança quem trata aquele
          domínio. Cada ação pede uma <strong>frase digitada</strong> e fica registrada na trilha.
          Desativar é uma ação separada, com frase própria.
        </Alert>

        <div className="a2l-table-wrap">
          <table className="a2l-table">
            <thead>
              <tr>
                <th>Onda</th>
                <th>Domínio tratado</th>
                <th>Em escopo</th>
                <th>Com adaptação</th>
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {ONDAS.flatMap(onda =>
                dominios.map(dominio => {
                  const c = porOndaEDominio[`${onda}:${dominio}`] || { total: 0, ativos: 0 }
                  return (
                    <tr key={`${onda}-${dominio}`}>
                      <td style={{ fontWeight: 600 }}>Onda {onda}</td>
                      <td>{dominio}</td>
                      <td>{c.total}</td>
                      <td>
                        {c.ativos > 0 ? (
                          <Badge tone="success">
                            {c.ativos}/{c.total}
                          </Badge>
                        ) : (
                          <span className="a2l-hint">nenhum</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 8, justifyContent: 'flex-end' }}>
                          <Button
                            size="sm"
                            variant={ACOES.activate.tom}
                            icon={ACOES.activate.icone}
                            disabled={c.total === 0 || c.ativos === c.total}
                            onClick={() => abrirDialogo('activate', onda, dominio)}
                          >
                            Ativar
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            icon={ACOES.deactivate.icone}
                            disabled={c.ativos === 0}
                            onClick={() => abrirDialogo('deactivate', onda, dominio)}
                          >
                            Desativar
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ------------------------------------------------------ alocação */}
      <AlocacaoCard onApplied={() => carregar({ silencioso: true })} />

      {/* ----------------------------------------------------- preparação */}
      <PrepararSessaoCard domains={dominios} schools={SCHOOLS} />

      {/* ------------------------------------------ banco e régua */}
      <BancoDePalavrasCard schools={SCHOOLS} />

      {/* --------------------------------------------------- participantes */}
      <Card>
        <SectionTitle
          action={
            <span className="a2l-hint">
              <LuUsers size={14} style={{ verticalAlign: -2 }} /> {participantes.length}{' '}
              participante(s)
            </span>
          }
        >
          Participantes
        </SectionTitle>

        <AdicionarParticipante
          domains={dominios}
          schools={SCHOOLS}
          jaNoRoster={new Set(participantes.map(p => p.uid))}
          onAdded={() => carregar({ silencioso: true })}
        />

        {participantes.length === 0 ? (
          <EmptyState
            title="Nenhum participante no roster"
            description="Use o formulário acima para matricular os participantes do estudo."
          />
        ) : (
          <div className="a2l-table-wrap">
            <table className="a2l-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Onda</th>
                  <th>Domínio tratado</th>
                  {dominios.map(d => (
                    <th key={d}>{d}</th>
                  ))}
                  <th>Desde</th>
                  <th>Slot</th>
                  <th>Monitor</th>
                  <th style={{ textAlign: 'right' }}>Editar</th>
                </tr>
              </thead>
              <tbody>
                {participantes.map(p => {
                  const emEdicao = editando?.uid === p.uid
                  const desde = dominios.map(d => p.adaptive_since?.[d]).find(Boolean)
                  return (
                    <tr key={p.uid}>
                      <td style={{ fontWeight: 600 }}>{p.participant_code || p.uid}</td>

                      <td>
                        {emEdicao ? (
                          <select
                            className="a2l-input"
                            value={editando.onda || ''}
                            onChange={e => setEditando(s => ({ ...s, onda: e.target.value }))}
                          >
                            <option value="">—</option>
                            {ONDAS.map(o => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            ))}
                          </select>
                        ) : (
                          p.onda || <span className="a2l-hint">—</span>
                        )}
                      </td>

                      <td>
                        {emEdicao ? (
                          <select
                            className="a2l-input"
                            value={editando.treated_domain || ''}
                            onChange={e =>
                              setEditando(s => ({ ...s, treated_domain: e.target.value }))
                            }
                          >
                            <option value="">—</option>
                            {dominios.map(d => (
                              <option key={d} value={d}>
                                {d}
                              </option>
                            ))}
                          </select>
                        ) : (
                          p.treated_domain || <span className="a2l-hint">—</span>
                        )}
                      </td>

                      {dominios.map(d => (
                        <td key={d}>
                          <ChipBraco
                            arm={p.arms?.[d]}
                            tratado={p.treated_domain === d}
                            desde={p.adaptive_since?.[d]}
                          />
                        </td>
                      ))}

                      <td className="a2l-hint">{dataCurta(desde)}</td>

                      <td>
                        {emEdicao ? (
                          <input
                            className="a2l-input"
                            value={editando.slot || ''}
                            onChange={e => setEditando(s => ({ ...s, slot: e.target.value }))}
                            placeholder="ter-14h"
                          />
                        ) : (
                          p.slot || <span className="a2l-hint">—</span>
                        )}
                      </td>

                      <td>
                        {emEdicao ? (
                          <input
                            className="a2l-input"
                            value={editando.monitor || ''}
                            onChange={e => setEditando(s => ({ ...s, monitor: e.target.value }))}
                          />
                        ) : (
                          p.monitor || <span className="a2l-hint">—</span>
                        )}
                      </td>

                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        {emEdicao ? (
                          <>
                            <Button
                              size="sm"
                              variant="primary"
                              icon={<LuCheck size={15} />}
                              loading={salvando}
                              onClick={salvarParticipante}
                              aria-label="Salvar"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              icon={<LuX size={15} />}
                              onClick={() => setEditando(null)}
                              aria-label="Cancelar"
                              style={{ marginLeft: 6 }}
                            />
                          </>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            icon={<LuPencil size={15} />}
                            aria-label={`Editar ${p.participant_code || p.uid}`}
                            onClick={() =>
                              setEditando({
                                uid: p.uid,
                                onda: p.onda || '',
                                treated_domain: p.treated_domain || '',
                                slot: p.slot || '',
                                monitor: p.monitor || '',
                              })
                            }
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ---------------------------------------------------------- trilha */}
      <Card>
        <SectionTitle
          action={
            <span className="a2l-hint">
              <LuHistory size={14} style={{ verticalAlign: -2 }} /> mais recente primeiro
            </span>
          }
        >
          Trilha de auditoria
        </SectionTitle>

        <Alert tone="info" style={{ marginBottom: 16 }}>
          Somente leitura. É a evidência de fidelidade da manipulação: quem ligou o quê, quando, e o
          estado antes e depois.
        </Alert>

        {trilha.length === 0 ? (
          <EmptyState
            title="Nenhuma ação registrada"
            description="Ativações, desativações e edições de cadastro aparecem aqui."
          />
        ) : (
          <div className="a2l-table-wrap">
            <table className="a2l-table">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Ação</th>
                  <th>Quem</th>
                  <th>Alvo</th>
                  <th>Observação</th>
                </tr>
              </thead>
              <tbody>
                {trilha.map(item => (
                  <tr key={item.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{horaCompleta(item.at)}</td>
                    <td>
                      <Badge
                        tone={
                          item.action === 'activate'
                            ? 'success'
                            : item.action === 'deactivate'
                              ? 'danger'
                              : 'neutral'
                        }
                      >
                        {item.action}
                      </Badge>
                    </td>
                    <td className="a2l-hint">{item.actor_uid}</td>
                    <td>
                      {item.target?.onda ? (
                        <>
                          onda {item.target.onda} · {item.target.domain}
                          {Array.isArray(item.target.uids) &&
                            ` · ${item.target.uids.length} uid(s)`}
                        </>
                      ) : (
                        item.target?.uid || item.target?.study_id || '—'
                      )}
                    </td>
                    <td className="a2l-hint">{item.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ActivationDialog
        open={!!dialogo}
        action={dialogo?.action}
        onda={dialogo?.onda}
        domain={dialogo?.domain}
        preview={dialogo?.preview}
        busy={!!dialogo?.busy}
        error={dialogo?.error}
        onConfirm={confirmar}
        onCancel={() => setDialogo(null)}
      />
    </div>
  )
}
