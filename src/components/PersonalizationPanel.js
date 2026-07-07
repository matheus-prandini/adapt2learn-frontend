import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'

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

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/personalization/config')
        const cfg = await parseJsonOrThrow(res)
        setEnabled(!!cfg.enabled)
        setSubarea(cfg.subarea || 'Geometria Plana')
        setActiveSince(cfg.active_since || '2026-01-01')
        setTestUids((cfg.test_uids || []).join(', '))
      } catch (e) {
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
        .map((s) => s.trim())
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
    } catch (e) {
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
    } catch (e) {
      toast.error('Falha ao rodar o dry-run.')
    } finally {
      setPreviewing(false)
    }
  }

  if (loading) return <p>🔄 Carregando configuração…</p>

  return (
    <div style={s.wrap}>
      <h3 style={s.title}>🎯 Personalização adaptativa</h3>
      <p style={s.note}>
        Liga/desliga a seleção personalizada de questões (braço adaptativo) em runtime, sem
        redeploy. A coorte são <strong>apenas os alunos matriculados</strong> (roster{' '}
        <code>study_participants</code>); a randomização é <strong>estratificada por turma</strong> e
        imutável. Controle = comportamento atual; qualquer erro cai no comportamento atual
        (fallback).
      </p>

      <label style={s.toggle}>
        <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
        <strong style={{ color: enabled ? '#2e7d32' : '#777' }}>
          {enabled ? 'ATIVADA' : 'Desativada'}
        </strong>
      </label>

      <label style={s.field}>
        <span>Subárea do estudo</span>
        <input style={s.input} value={subarea} onChange={(e) => setSubarea(e.target.value)} />
      </label>

      <label style={s.field}>
        <span>Ativos desde (corte p/ "ativo" no dry-run — ex.: rollout de geometria)</span>
        <input
          style={s.input}
          value={activeSince}
          onChange={(e) => setActiveSince(e.target.value)}
          placeholder="2026-06-01"
        />
      </label>

      <label style={s.field}>
        <span>UIDs de teste (opcional)</span>
        <textarea
          style={{ ...s.input, minHeight: 60 }}
          placeholder="vírgula-separados — vazio = coorte inteira; preencha p/ testar só alguns"
          value={testUids}
          onChange={(e) => setTestUids(e.target.value)}
        />
        <small style={s.hint}>
          Com UIDs preenchidos, só eles (e do roster) recebem a personalização. Vazio = coorte
          inteira.
        </small>
      </label>

      <button style={s.btn} onClick={save} disabled={saving}>
        {saving ? 'Salvando…' : 'Salvar'}
      </button>

      {/* ---- Dry-run / preview ---- */}
      <hr style={s.hr} />
      <h4 style={s.subtitle}>🔍 Dry-run (preview, não altera nada)</h4>
      <p style={s.note}>
        Mostra a coorte matriculada, o split projetado (controle × adaptativo) por turma, e quem
        receberia a personalização — <strong>sem persistir</strong> nada.
      </p>
      <button style={{ ...s.btn, background: '#00695c' }} onClick={runPreview} disabled={previewing}>
        {previewing ? 'Rodando…' : 'Rodar dry-run'}
      </button>

      {preview && (
        <div style={s.previewBox}>
          <div>
            <strong>Coorte (roster):</strong> {preview.n_participants} · já atribuídos:{' '}
            {preview.n_assigned}
          </div>
          <div>
            <strong>Ativos</strong> (com evento desde {preview.active_since}): {preview.n_active} de{' '}
            {preview.n_participants}
          </div>
          <div>
            <strong>split projetado</strong> — controle: {preview.projected_split?.control} ·
            adaptativo: {preview.projected_split?.adaptive}
          </div>
          <div>
            <strong>Receberiam personalização</strong> (adaptativo + elegível):{' '}
            {preview.n_would_get_personalization}
          </div>
          <div style={s.cfgLine}>
            master switch: <strong>{preview.enabled ? 'LIGADO' : 'desligado'}</strong>
            {!preview.enabled && ' — ligue o toggle acima p/ aplicar de fato'}
          </div>
          {preview.by_turma && (
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Turma</th>
                  <th style={s.th}>Controle</th>
                  <th style={s.th}>Adaptativo</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(preview.by_turma)
                  .sort()
                  .map(([t, c]) => (
                    <tr key={t}>
                      <td style={s.td}>{t}</td>
                      <td style={s.td}>{c.control}</td>
                      <td style={s.td}>{c.adaptive}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}

const s = {
  wrap: { maxWidth: 680, margin: '0 auto', textAlign: 'left' },
  title: { fontSize: 18, color: '#4a148c', margin: '8px 0 4px' },
  subtitle: { fontSize: 16, color: '#00695c', margin: '4px 0' },
  note: { color: '#555', fontSize: 14, marginBottom: 16, lineHeight: 1.5 },
  toggle: { display: 'flex', gap: 10, alignItems: 'center', margin: '12px 0', fontSize: 16 },
  field: { display: 'flex', flexDirection: 'column', gap: 4, margin: '12px 0' },
  input: { padding: 8, borderRadius: 6, border: '1px solid #ccc', fontFamily: 'inherit' },
  hint: { color: '#777', fontSize: 12 },
  hr: { margin: '20px 0', border: 'none', borderTop: '1px solid #ddd' },
  btn: {
    marginTop: 12,
    padding: '10px 20px',
    background: '#6a1b9a',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
    fontWeight: 'bold',
  },
  previewBox: {
    marginTop: 16,
    padding: 12,
    background: '#e0f2f1',
    borderRadius: 8,
    fontSize: 14,
    lineHeight: 1.6,
  },
  cfgLine: { color: '#555', fontSize: 12, marginTop: 6 },
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 10, fontSize: 13 },
  th: { textAlign: 'left', borderBottom: '1px solid #999', padding: 6 },
  td: { padding: 6, borderBottom: '1px solid #eee' },
}
