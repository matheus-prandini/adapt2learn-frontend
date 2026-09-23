import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { LuUserPlus } from 'react-icons/lu'
import { apiJson } from '../../api/httpClient'
import { updateParticipant } from '../../api/studyApi'
import { Alert, Button, Field } from '../../components/ui'

/**
 * Matrícula de um participante no estudo, a partir dos alunos já cadastrados.
 *
 * O roster da Associação tem 16 a 24 pessoas — pequeno o bastante para ser
 * montado aqui, uma a uma, em vez de por script. O que o script evitaria (erro
 * de digitação de uid) esta tela evita melhor: o aluno é **escolhido** de uma
 * lista, não digitado, então o uid vem do cadastro e não da memória de ninguém.
 *
 * Matricular **não liga adaptação nenhuma**: define onda e domínio tratado. O
 * braço só muda pela ativação, com frase digitada e trilha.
 */
export default function AdicionarParticipante({ domains = [], schools = [], jaNoRoster, onAdded }) {
  const [school, setSchool] = useState(schools[0] || '')
  const [alunos, setAlunos] = useState([])
  const [carregando, setCarregando] = useState(false)
  const [uid, setUid] = useState('')
  const [onda, setOnda] = useState('1')
  const [dominio, setDominio] = useState(domains[0] || '')
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (!school) return undefined
    let cancelado = false
    setCarregando(true)
    setUid('')
    apiJson(`/users?school_id=${encodeURIComponent(school)}`, undefined, 'Erro ao carregar alunos.')
      .then(lista => {
        if (!cancelado) setAlunos(Array.isArray(lista) ? lista : [])
      })
      .catch(err => {
        if (!cancelado) toast.error(err.message)
      })
      .finally(() => {
        if (!cancelado) setCarregando(false)
      })
    return () => {
      cancelado = true
    }
  }, [school])

  // Quem já está no roster sai da lista: matricular duas vezes não quebraria
  // nada (o upsert é idempotente), mas a lista fica ilegível e convida ao erro.
  const disponiveis = alunos.filter(a => !jaNoRoster?.has(a.uid))

  const adicionar = async () => {
    if (!uid || !dominio) return
    setSalvando(true)
    try {
      await updateParticipant(uid, { onda: Number(onda), treated_domain: dominio })
      toast.success('Participante matriculado.')
      setUid('')
      onAdded?.()
    } catch (err) {
      toast.error(err.message || 'Falha ao matricular.')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div
      style={{
        padding: '16px 18px',
        background: 'var(--a2l-surface-2)',
        border: '1px solid var(--a2l-line)',
        borderRadius: 'var(--a2l-radius)',
        marginBottom: 18,
      }}
    >
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

        <Field
          label="Aluno"
          hint={carregando ? 'carregando…' : `${disponiveis.length} fora do roster`}
          style={{ minWidth: 240 }}
        >
          <select value={uid} onChange={e => setUid(e.target.value)} disabled={carregando}>
            <option value="">selecione…</option>
            {disponiveis.map(a => (
              <option key={a.uid} value={a.uid}>
                {a.name} — {a.mail}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Onda" style={{ minWidth: 110 }}>
          <select value={onda} onChange={e => setOnda(e.target.value)}>
            <option value="1">1</option>
            <option value="2">2</option>
          </select>
        </Field>

        <Field
          label="Domínio tratado"
          hint="O outro vira controle interno"
          style={{ minWidth: 170 }}
        >
          <select value={dominio} onChange={e => setDominio(e.target.value)}>
            {domains.map(d => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </Field>

        <Button
          onClick={adicionar}
          loading={salvando}
          disabled={!uid || !dominio}
          icon={<LuUserPlus size={16} />}
        >
          Matricular
        </Button>
      </div>

      <Alert tone="info" style={{ marginTop: 14 }}>
        Matricular define <strong>onda</strong> e <strong>domínio tratado</strong> — não liga
        adaptação. O braço só muda pela ativação da onda, com frase digitada e registro na trilha.
      </Alert>
    </div>
  )
}
