import React, { useState } from 'react'
import { toast } from 'react-toastify'
import { LuBookOpenCheck, LuRuler } from 'react-icons/lu'
import { getWordBank, setProbe } from '../../api/studyApi'
import { Alert, Badge, Button, Card, Field, Switch } from '../../components/ui'
import SectionTitle from './SectionTitle'

/**
 * Curadoria do banco de palavras e montagem da régua (sondagem).
 *
 * Era o último passo do estudo que exigia console do Firestore — e é o que
 * destrava a medida primária: sem itens marcados como sondagem, `phase=sondagem`
 * cai no comportamento de sempre e a régua não existe.
 *
 * A **ordem** da régua não se edita aqui, e isso é de propósito: ela é derivada
 * pelo backend (dificuldade intercalada e não crescente, como o protocolo pede).
 * A curadoria escolhe QUAIS palavras entram; a ordem sai pronta. Deixar a ordem
 * editável convidaria a montá-la em dificuldade crescente, que é exatamente o
 * que o protocolo proíbe — se a criança parar no meio, os dados ausentes ficariam
 * concentrados nos itens difíceis.
 */

const ALVO_POR_DOMINIO = 10

export default function BancoDePalavrasCard({ schools = [] }) {
  const [school, setSchool] = useState(schools[0] || '')
  const [discipline, setDiscipline] = useState('Português')
  const [subarea, setSubarea] = useState('Alfabetização')
  const [itens, setItens] = useState(null)
  const [carregando, setCarregando] = useState(false)
  const [salvando, setSalvando] = useState(null)

  const carregar = async () => {
    setCarregando(true)
    try {
      const r = await getWordBank({ school_id: school, discipline, subarea })
      setItens(r.items || [])
    } catch (err) {
      toast.error(err.message || 'Falha ao carregar o banco.')
    } finally {
      setCarregando(false)
    }
  }

  const alternar = async (item, valor) => {
    setSalvando(item.id)
    try {
      await setProbe(item.id, valor)
      // Recarrega em vez de mexer no estado local: a POSIÇÃO na régua de todos
      // os outros itens muda quando um entra ou sai, porque a ordem é derivada.
      await carregar()
    } catch (err) {
      toast.error(err.message || 'Falha ao alterar a régua.')
    } finally {
      setSalvando(null)
    }
  }

  const naRegua = (itens || []).filter(i => i.probe)
  const naoClassificadas = (itens || []).filter(i => !i.classified)

  return (
    <Card>
      <SectionTitle>Banco de palavras e régua</SectionTitle>

      <Alert tone="info" style={{ marginBottom: 16 }}>
        A <strong>ordem</strong> da régua não se edita: o backend intercala a dificuldade (curta,
        longa, média, muito longa) como o protocolo pede. Você escolhe <strong>quais</strong>{' '}
        palavras entram — a ordem sai pronta e é a mesma em todas as sessões.
      </Alert>

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
        <Button onClick={carregar} loading={carregando} icon={<LuBookOpenCheck size={16} />}>
          {carregando ? 'Carregando…' : 'Carregar banco'}
        </Button>
      </div>

      {itens && (
        <div className="a2l-anim-in" style={{ marginTop: 18 }}>
          <Alert
            tone={naRegua.length === ALVO_POR_DOMINIO ? 'success' : 'warning'}
            style={{ marginBottom: 14 }}
          >
            <LuRuler size={15} style={{ verticalAlign: -2 }} />{' '}
            <strong>
              {naRegua.length} de {ALVO_POR_DOMINIO}
            </strong>{' '}
            palavras na régua.{' '}
            {naRegua.length === 0 &&
              'Sem itens marcados, a sondagem NÃO está congelada — o jogo recebe itens de treino no lugar dela.'}
            {naRegua.length > 0 &&
              naRegua.length !== ALVO_POR_DOMINIO &&
              'O protocolo prevê 10 itens por domínio.'}
          </Alert>

          {naoClassificadas.length > 0 && (
            <Alert tone="warning" style={{ marginBottom: 14 }}>
              <strong>{naoClassificadas.length} palavra(s) não se encaixam em banda nenhuma</strong>{' '}
              e ficam fora do banco. Aparecem na tabela com o motivo — normalmente extensão fora das
              faixas ou caractere não alfabético.
            </Alert>
          )}

          <div className="a2l-table-wrap">
            <table className="a2l-table">
              <thead>
                <tr>
                  <th>Palavra</th>
                  <th>Letras</th>
                  <th>Banda</th>
                  <th>Na régua</th>
                  <th>Posição</th>
                </tr>
              </thead>
              <tbody>
                {itens.map(item => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600 }}>
                      {item.word || <span className="a2l-hint">(sem palavra)</span>}
                      {!item.classified && (
                        <div className="a2l-hint" style={{ marginTop: 2 }}>
                          {item.reason}
                        </div>
                      )}
                    </td>
                    <td>{item.letters ?? '—'}</td>
                    <td>
                      {item.skill ? (
                        <Badge tone="brand">{item.skill}</Badge>
                      ) : (
                        <Badge tone="danger">fora das bandas</Badge>
                      )}
                    </td>
                    <td>
                      <Switch
                        checked={!!item.probe}
                        disabled={!item.classified || salvando === item.id}
                        onChange={e => alternar(item, e.target.checked)}
                      />
                    </td>
                    <td>
                      {item.probe_index != null ? (
                        <Badge tone="mint">{item.probe_index + 1}º</Badge>
                      ) : (
                        <span className="a2l-hint">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Alert tone="warning" style={{ marginTop: 14 }}>
            Cada mudança aqui <strong>vai para a trilha de auditoria</strong>. O protocolo pede a
            sondagem congelada desde S2: mexer na régua depois do início da coleta muda o
            instrumento no meio da medição, e isso não se corrige na análise — só se declara.
          </Alert>
        </div>
      )}
    </Card>
  )
}
