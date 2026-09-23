import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { LuDices, LuShieldAlert } from 'react-icons/lu'
import { allocateStudy, STUDY_ERROR } from '../../api/studyApi'
import { Alert, Badge, Button, Card, Field, Stat, Switch } from '../../components/ui'
import { matchesConfirmation } from './confirmationPhrase'
import SectionTitle from './SectionTitle'

/**
 * Alocação do 02/10: sorteia onda e domínio tratado em blocos estratificados.
 *
 * A tela existe para que a alocação seja **vista antes de ser aplicada**. Isso
 * não é conforto de operação, é parte do método: randomização equilibra em
 * expectativa, não em cada sorteio, e a decisão de aceitar um sorteio tem de ser
 * tomada olhando o equilíbrio realizado — e **antes** de ver os resultados do
 * estudo, nunca depois.
 *
 * A **semente** é mostrada e reenviada no apply de propósito. Sem ela, o que o
 * banco recebe não é o que a tela mostrou, e "reproduzível a partir da semente
 * registrada" deixa de ser verdade no artigo.
 */

const CONFIRMACAO = 'ALOCAR ESTUDO'

export default function AlocacaoCard({ onApplied }) {
  const [proposta, setProposta] = useState(null)
  const [propondo, setPropondo] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [frase, setFrase] = useState('')
  const [overwrite, setOverwrite] = useState(false)
  const [erro, setErro] = useState(null)

  const propor = async () => {
    setPropondo(true)
    setErro(null)
    setFrase('')
    try {
      setProposta(await allocateStudy({ dry_run: true }))
    } catch (err) {
      toast.error(err.message || 'Falha ao propor a alocação.')
    } finally {
      setPropondo(false)
    }
  }

  const aplicar = async () => {
    if (!proposta) return
    setAplicando(true)
    setErro(null)
    try {
      const r = await allocateStudy({
        dry_run: false,
        seed: proposta.seed,
        confirmation: frase,
        overwrite,
      })
      toast.success(`Alocação aplicada a ${r.assignments.length} participante(s).`)
      setProposta(null)
      setFrase('')
      setOverwrite(false)
      onApplied?.()
    } catch (err) {
      setErro(err)
      if (err.status !== STUDY_ERROR.NEEDS_CONFIRMATION && err.status !== STUDY_ERROR.CONFLICT) {
        toast.error(err.message || 'Falha ao aplicar a alocação.')
      }
    } finally {
      setAplicando(false)
    }
  }

  const equilibrio = proposta?.balance?.by_wave
  const desequilibrio =
    equilibrio && equilibrio['1'] && equilibrio['2']
      ? Math.abs(equilibrio['1'].mean_assiduity - equilibrio['2'].mean_assiduity)
      : null

  return (
    <Card>
      <SectionTitle>Alocação (02/10)</SectionTitle>

      <Alert tone="info" style={{ marginBottom: 16 }}>
        Sorteia <strong>onda</strong> e <strong>domínio tratado</strong> em blocos de quatro dentro
        de estratos ordenados por nível inicial e assiduidade. O nível vem da{' '}
        <strong>sondagem</strong>, não do treino — nível medido no treino dependeria de quais itens
        foram servidos.
      </Alert>

      <Button onClick={propor} loading={propondo} icon={<LuDices size={16} />}>
        {propondo ? 'Sorteando…' : 'Propor alocação'}
      </Button>

      {proposta && (
        <div className="a2l-anim-in" style={{ marginTop: 20 }}>
          <div className="a2l-grid a2l-grid--stats" style={{ marginBottom: 14 }}>
            <Stat label="Participantes" value={proposta.n_candidates} />
            <Stat
              label="Semente"
              tone="neutral"
              value={proposta.seed}
              foot="registrada na trilha"
            />
            <Stat
              label="Δ assiduidade entre ondas"
              tone={desequilibrio != null && desequilibrio > 1 ? 'sun' : 'success'}
              value={desequilibrio != null ? desequilibrio.toFixed(2) : '—'}
              foot="típico ≈ 0,4"
            />
            <Stat
              label="Já alocados"
              tone={proposta.already_allocated?.length ? 'danger' : 'neutral'}
              value={proposta.already_allocated?.length ?? 0}
            />
          </div>

          <Alert tone="warning" style={{ marginBottom: 16 }}>
            <strong>Randomização equilibra em expectativa, não em cada sorteio.</strong> Se este
            sorteio não agradar, a regra para refazer tem de ter sido decidida <em>antes</em> de
            olhar — por exemplo "sortear até Δ &lt; 1,0, no máximo 5 vezes, registrando todas".
            Refazer até gostar do resultado esvazia a randomização.
          </Alert>

          <div className="a2l-table-wrap" style={{ marginBottom: 16 }}>
            <table className="a2l-table">
              <thead>
                <tr>
                  <th>Participante</th>
                  <th>Estrato</th>
                  <th>Nível inicial</th>
                  <th>Assiduidade</th>
                  <th>Onda</th>
                  <th>Domínio tratado</th>
                </tr>
              </thead>
              <tbody>
                {proposta.assignments.map(a => (
                  <tr key={a.uid}>
                    <td style={{ fontWeight: 600 }}>{a.participant_code || a.uid}</td>
                    <td>{a.stratum}</td>
                    <td>
                      {a.baseline_level ?? <span className="a2l-hint">sem dado</span>}
                      {a.level_source === 'todas_as_respostas' && (
                        <Badge
                          tone="sun"
                          style={{ marginLeft: 6 }}
                          title="Sem resposta de sondagem; usou todas as respostas"
                        >
                          aprox.
                        </Badge>
                      )}
                    </td>
                    <td>{a.assiduity}</td>
                    <td>
                      <Badge tone={a.onda === 1 ? 'brand' : 'mint'}>onda {a.onda}</Badge>
                    </td>
                    <td>{a.treated_domain}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {proposta.already_allocated?.length > 0 && (
            <>
              <Alert tone="error" style={{ marginBottom: 12 }}>
                <LuShieldAlert size={15} style={{ verticalAlign: -2 }} />{' '}
                <strong>
                  {proposta.already_allocated.length} participante(s) já estão alocados.
                </strong>{' '}
                Re-sortear depois de alocar esvazia a randomização. A trilha guarda a semente das
                duas tentativas, então a sobrescrita fica visível na auditoria.
              </Alert>
              <div style={{ marginBottom: 14 }}>
                <Switch
                  checked={overwrite}
                  onChange={e => setOverwrite(e.target.checked)}
                  label="Refazer mesmo assim"
                  hint="Só se a regra de refazer tiver sido decidida de antemão."
                />
              </div>
            </>
          )}

          <Field
            label="Para aplicar, digite a frase"
            hint={
              <>
                Digite exatamente: <code>{CONFIRMACAO}</code>
              </>
            }
          >
            <input
              value={frase}
              onChange={e => setFrase(e.target.value)}
              placeholder={CONFIRMACAO}
              autoComplete="off"
              spellCheck={false}
            />
          </Field>

          {erro && (
            <Alert tone="error" style={{ marginTop: 12 }}>
              {erro.message}
            </Alert>
          )}

          <Button
            onClick={aplicar}
            loading={aplicando}
            disabled={
              !matchesConfirmation(frase, CONFIRMACAO) ||
              (proposta.already_allocated?.length > 0 && !overwrite)
            }
            style={{ marginTop: 16 }}
          >
            Aplicar alocação (semente {proposta.seed})
          </Button>
        </div>
      )}
    </Card>
  )
}
