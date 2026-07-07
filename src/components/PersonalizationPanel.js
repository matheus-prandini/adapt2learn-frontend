import React, { useEffect, useState } from 'react'
import { toast } from 'react-toastify'
import { apiFetch, parseJsonOrThrow } from '../api/httpClient'

// Painel de admin: liga/desliga a personalização adaptativa em runtime e roda um
// dry-run (preview) mostrando o split de braços e quem receberia personalização.
export default function PersonalizationPanel() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [subarea, setSubarea] = useState('Geometria Plana')
  const [testUids, setTestUids] = useState('') // vírgula-separado

  // dry-run
  const [schoolId, setSchoolId] = useState('Messias Pedreiro')
  const [preview, setPreview] = useState(null)
  const [previewing, setPreviewing] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const res = await apiFetch('/personalization/config')
        const cfg = await parseJsonOrThrow(res)
        setEnabled(!!cfg.enabled)
        setSubarea(cfg.subarea || 'Geometria Plana')
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
        body: JSON.stringify({ enabled, subarea, test_uids }),
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
      const qs = `?school_id=${encodeURIComponent(schoolId)}&subarea=${encodeURIComponent(subarea)}`
      const res = await apiFetch(`/personalization/preview${qs}`)
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
        redeploy. Controle = comportamento atual; qualquer erro cai no comportamento atual
        (fallback). A atribuição de braço é persistida e imutável.
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
        <span>UIDs de teste (opcional)</span>
        <textarea
          style={{ ...s.input, minHeight: 60 }}
          placeholder="vírgula-separados — vazio = TODOS; preencha p/ testar só alguns"
          value={testUids}
          onChange={(e) => setTestUids(e.target.value)}
        />
        <small style={s.hint}>
          Com UIDs preenchidos, só eles recebem a personalização (teste seguro). Vazio = coorte
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
        Mostra o split projetado (controle × adaptativo) e quem receberia a personalização com a
        config atual — <strong>sem persistir</strong> nada.
      </p>
      <label style={s.field}>
        <span>Escola (school_id)</span>
        <input style={s.input} value={schoolId} onChange={(e) => setSchoolId(e.target.value)} />
      </label>
      <button style={{ ...s.btn, background: '#00695c' }} onClick={runPreview} disabled={previewing}>
        {previewing ? 'Rodando…' : 'Rodar dry-run'}
      </button>

      {preview && (
        <div style={s.previewBox}>
          <div>
            <strong>Alunos:</strong> {preview.n_students} ·{' '}
            <strong>split projetado</strong> — controle: {preview.projected_split?.control} ·
            adaptativo: {preview.projected_split?.adaptive}
          </div>
          <div>
            <strong>Receberiam personalização</strong> (braço adaptativo + elegível):{' '}
            {preview.n_would_get_personalization} · elegíveis (gate test_uids): {preview.n_eligible}
          </div>
          <div style={s.cfgLine}>
            master switch: <strong>{preview.enabled ? 'LIGADO' : 'desligado'}</strong> · subarea=
            {preview.subarea} · test_uids={(preview.config?.test_uids || []).length || 'todos'}
            {!preview.enabled && ' — ligue o toggle acima p/ aplicar de fato'}
          </div>
          <details style={{ marginTop: 8 }}>
            <summary>Ver por aluno ({preview.students?.length})</summary>
            <table style={s.table}>
              <thead>
                <tr>
                  <th style={s.th}>Nome</th>
                  <th style={s.th}>Braço</th>
                  <th style={s.th}>Atribuído?</th>
                  <th style={s.th}>Recebe?</th>
                </tr>
              </thead>
              <tbody>
                {(preview.students || []).map((p) => (
                  <tr key={p.uid}>
                    <td style={s.td}>{p.name || p.uid.slice(0, 8)}</td>
                    <td style={s.td}>{p.arm}</td>
                    <td style={s.td}>{p.assigned ? 'sim' : '—'}</td>
                    <td style={s.td}>{p.would_get_personalization ? '✅' : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </details>
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
  table: { width: '100%', borderCollapse: 'collapse', marginTop: 8, fontSize: 13 },
  th: { textAlign: 'left', borderBottom: '1px solid #999', padding: 6 },
  td: { padding: 6, borderBottom: '1px solid #eee' },
}
