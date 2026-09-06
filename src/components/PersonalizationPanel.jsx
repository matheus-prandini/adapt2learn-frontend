import React, { useEffect, useRef, useState } from 'react'
import { toast } from 'react-toastify'
import { LuTarget, LuFlaskConical, LuFactory, LuSave, LuPlay } from 'react-icons/lu'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'
import { Card, Button, Field, Alert, Badge, Switch, Loader, Stat } from './ui'

// Painel de admin: liga/desliga a personalização adaptativa em runtime e roda um
// dry-run (preview) da coorte (roster study_participants), com split por turma.
export default function PersonalizationPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [subarea, setSubarea] = useState('Geometria Plana')
  const [activeSince, setActiveSince] = useState('2026-01-01')
  const [testUids, setTestUids] = useState('') // vírgula-separado

  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  // Estágio 1: geração de itens novos (pré-preenche o pool)
  const [genTarget, setGenTarget] = useState(3)
  const [genCommit, setGenCommit] = useState(true)
  const [genJob, setGenJob] = useState(null) // {status, report, error}
  const [generating, setGenerating] = useState(false)

  // O polling da geração vive fora do React; sem isto, sair da aba deixava o
  // setTimeout recursivo rodando por até 6 min e chamando setState no vazio.
  const pollTimer = useRef(null)
  const alive = useRef(true)
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      clearTimeout(pollTimer.current)
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/personalization/config')
        const cfg = await parseJsonOrThrow(res)
        setEnabled(!!cfg.enabled)
        setSubarea(cfg.subarea || 'Geometria Plana')
        setActiveSince(cfg.active_since || '2026-01-01')
        setTestUids((cfg.test_uids || []).join(', '))
      } catch {
        toast.error('Falha ao carregar a config de personalização.')
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const save = async () => {
    setSaving(true)
    try {
      const test_uids = testUids
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
      const res = await apiFetch('/personalization/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, subarea, active_since: activeSince, test_uids }),
      })
      await parseJsonOrThrow(res)
      toast.success(
        `Personalização ${enabled ? 'ATIVADA' : 'desativada'}` +
          (test_uids.length ? ` (só ${test_uids.length} de teste)` : ' (coorte inteira)')
      )
    } catch {
      toast.error('Falha ao salvar a config.')
    } finally {
      setSaving(false)
    }
  }

  const runPreview = async () => {
    setPreviewing(true)
    setPreview(null)
    try {
      const res = await apiFetch('/personalization/preview')
      const data = await parseJsonOrThrow(res)
      setPreview(data)
    } catch {
      toast.error('Falha ao rodar o dry-run.')
    } finally {
      setPreviewing(false)
    }
  }

  const runGeneration = async () => {
    setGenerating(true)
    setGenJob({ status: 'started' })
    try {
      const res = await apiFetch('/personalization/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subarea,
          target_per_cell: Number(genTarget) || 3,
          commit: genCommit,
        }),
      })
      const started = await parseJsonOrThrow(res)
      const jobId = started.job_id
      let tries = 0
      const MAX_TRIES = 90 // ~6 min (poll a cada 4s)
      const poll = async () => {
        if (!alive.current) return
        tries += 1
        try {
          const r = await apiFetch(`/personalization/generate/${jobId}`)
          const j = await parseJsonOrThrow(r)
          setGenJob(j)
          if (j.status === 'done') {
            setGenerating(false)
            toast.success('Geração concluída.')
            return
          }
          if (j.status === 'error') {
            setGenerating(false)
            toast.error('Geração falhou: ' + (j.error || ''))
            return
          }
        } catch {
          /* transitório — segue tentando */
        }
        if (tries >= MAX_TRIES) {
          setGenerating(false)
          setGenJob(prev => ({ ...(prev || {}), status: 'timeout' }))
          toast.warn(
            'Job ainda "started" após ~6 min — pode ter sido interrompido (Cloud Run). Prefira a CLI.'
          )
          return
        }
        pollTimer.current = setTimeout(poll, 4000)
      }
      pollTimer.current = setTimeout(poll, 4000)
    } catch {
      toast.error('Falha ao disparar a geração.')
      setGenerating(false)
    }
  }

  if (loading) return <Loader label="Carregando configuração…" />

  return (
    <div
      className="a2l-stack"
      style={{ gap: 20, maxWidth: 760, margin: '0 auto', textAlign: 'left' }}
    >
      {/* ---- Configuração ---- */}
      <Card hero>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <span className="a2l-icon-chip a2l-icon-chip--solid">
            <LuTarget size={19} />
          </span>
          <div>
            <h3 style={{ fontSize: 'var(--a2l-text-lg)' }}>Personalização adaptativa</h3>
            <p className="a2l-hint" style={{ marginTop: 4 }}>
              Liga/desliga a seleção personalizada de questões em runtime, sem redeploy.
            </p>
          </div>
        </div>

        <Alert tone="info" style={{ marginBottom: 20 }}>
          A coorte são <strong>apenas os alunos matriculados</strong> (roster{' '}
          <code>study_participants</code>). A randomização é{' '}
          <strong>estratificada por turma</strong> e imutável. Controle = comportamento atual;
          qualquer erro cai no comportamento atual (fallback).
        </Alert>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            padding: '14px 16px',
            background: enabled ? 'var(--a2l-success-bg)' : 'var(--a2l-surface-2)',
            border: `1px solid ${enabled ? 'var(--a2l-success-br)' : 'var(--a2l-line)'}`,
            borderRadius: 'var(--a2l-radius)',
            marginBottom: 20,
            transition: 'all var(--a2l-normal) var(--a2l-ease)',
          }}
        >
          <Switch checked={enabled} onChange={e => setEnabled(e.target.checked)} />
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: 'var(--a2l-font-display)', fontWeight: 700 }}>
              {enabled ? 'Personalização ativada' : 'Personalização desativada'}
            </div>
            <div className="a2l-hint">
              {enabled
                ? 'A coorte adaptativa recebe questões personalizadas.'
                : 'Todos os alunos seguem o comportamento de controle.'}
            </div>
          </div>
          <Badge tone={enabled ? 'success' : 'neutral'}>{enabled ? 'ON' : 'OFF'}</Badge>
        </div>

        <div className="a2l-stack" style={{ gap: 16 }}>
          <Field label="Subárea do estudo">
            <input value={subarea} onChange={e => setSubarea(e.target.value)} />
          </Field>

          <Field
            label="Ativos desde"
            hint='Corte para considerar um aluno "ativo" no dry-run — ex.: rollout de geometria.'
          >
            <input
              value={activeSince}
              onChange={e => setActiveSince(e.target.value)}
              placeholder="2026-06-01"
            />
          </Field>

          <Field
            label="UIDs de teste"
            optional
            hint="Com UIDs preenchidos, só eles (e do roster) recebem a personalização. Vazio = coorte inteira."
          >
            <textarea
              placeholder="vírgula-separados — vazio = coorte inteira"
              value={testUids}
              onChange={e => setTestUids(e.target.value)}
              rows={2}
            />
          </Field>
        </div>

        <Button
          onClick={save}
          loading={saving}
          icon={<LuSave size={17} />}
          style={{ marginTop: 18 }}
        >
          {saving ? 'Salvando…' : 'Salvar configuração'}
        </Button>
      </Card>

      {/* ---- Dry-run / preview ---- */}
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <span className="a2l-icon-chip a2l-icon-chip--mint">
            <LuFlaskConical size={19} />
          </span>
          <div>
            <h4 style={{ fontSize: 'var(--a2l-text-md)' }}>Dry-run (preview)</h4>
            <p className="a2l-hint" style={{ marginTop: 4 }}>
              Mostra a coorte matriculada, o split projetado por turma e quem receberia a
              personalização — <strong>sem persistir nada</strong>.
            </p>
          </div>
        </div>

        <Button
          variant="accent"
          onClick={runPreview}
          loading={previewing}
          icon={<LuPlay size={16} />}
        >
          {previewing ? 'Rodando…' : 'Rodar dry-run'}
        </Button>

        {preview && (
          <div className="a2l-anim-in" style={{ marginTop: 20 }}>
            <div className="a2l-grid a2l-grid--stats" style={{ marginBottom: 16 }}>
              <Stat
                label="Coorte (roster)"
                value={preview.n_participants}
                foot={`${preview.n_assigned} já atribuídos`}
              />
              <Stat
                label="Ativos"
                tone="mint"
                value={preview.n_active}
                foot={`desde ${preview.active_since}`}
              />
              <Stat
                label="Controle"
                tone="neutral"
                value={preview.projected_split?.control ?? '—'}
              />
              <Stat
                label="Adaptativo"
                tone="success"
                value={preview.projected_split?.adaptive ?? '—'}
              />
            </div>

            <Alert tone={preview.enabled ? 'success' : 'warning'}>
              Receberiam personalização: <strong>{preview.n_would_get_personalization}</strong> ·
              master switch <strong>{preview.enabled ? 'LIGADO' : 'desligado'}</strong>
              {!preview.enabled && ' — ligue o toggle acima para aplicar de fato.'}
            </Alert>

            {preview.by_turma && (
              <div className="a2l-table-wrap" style={{ marginTop: 16 }}>
                <table className="a2l-table">
                  <thead>
                    <tr>
                      <th>Turma</th>
                      <th>Controle</th>
                      <th>Adaptativo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(preview.by_turma)
                      .sort()
                      .map(([t, c]) => (
                        <tr key={t}>
                          <td style={{ fontWeight: 600 }}>{t}</td>
                          <td>{c.control}</td>
                          <td>{c.adaptive}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ---- Estágio 1: geração de itens novos ---- */}
      <Card>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 14 }}>
          <span className="a2l-icon-chip a2l-icon-chip--sun">
            <LuFactory size={19} />
          </span>
          <div>
            <h4 style={{ fontSize: 'var(--a2l-text-md)' }}>Gerar itens novos (Estágio 1)</h4>
            <p className="a2l-hint" style={{ marginTop: 4 }}>
              Pré-preenche o pool com itens novos (ex.: tier <code>hard</code>, que está vazio) via
              LLM,
              <strong> fora do caminho do aluno</strong>. Requer <code>OPENAI_API_KEY</code> no
              backend.
            </p>
          </div>
        </div>

        <div className="a2l-stack" style={{ gap: 16 }}>
          <Field label="Itens por célula" hint="Combinação conceito × dificuldade.">
            <input
              type="number"
              min={1}
              value={genTarget}
              onChange={e => setGenTarget(e.target.value)}
            />
          </Field>

          <Switch
            checked={genCommit}
            onChange={e => setGenCommit(e.target.checked)}
            label="Persistir no pool"
            hint="Desmarque para rodada seca / QA."
          />
        </div>

        <Button
          variant="sun"
          onClick={runGeneration}
          loading={generating}
          icon={<LuFactory size={17} />}
          style={{ marginTop: 18 }}
        >
          {generating ? 'Gerando… (pode levar minutos)' : 'Gerar itens (Estágio 1)'}
        </Button>

        <Alert tone="warning" style={{ marginTop: 16 }}>
          Em Cloud Run com <code>min-instances 0</code>, o job roda em background e pode ser{' '}
          <strong>interrompido</strong> (CPU throttled após a resposta). Para um lote grande e
          confiável, prefira a CLI (<code>python -m app.experiments.pregenerate_pool --commit</code>
          ) ou mantenha uma instância quente durante a geração.
        </Alert>

        {genJob && (
          <div className="a2l-anim-in" style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="a2l-eyebrow-sm">Status</span>
              <Badge
                tone={
                  genJob.status === 'done'
                    ? 'success'
                    : genJob.status === 'error'
                      ? 'danger'
                      : 'brand'
                }
              >
                {genJob.status}
              </Badge>
              {generating && genJob.status === 'started' && (
                <span className="a2l-spinner a2l-spinner--sm" aria-hidden="true" />
              )}
            </div>
            {genJob.report && (
              <pre className="a2l-pre">{JSON.stringify(genJob.report, null, 2)}</pre>
            )}
            {genJob.error && (
              <Alert tone="error" style={{ marginTop: 10 }}>
                Erro: {genJob.error}
              </Alert>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
