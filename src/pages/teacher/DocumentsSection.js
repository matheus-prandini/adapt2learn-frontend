import React, { useState, useEffect } from 'react'
import { apiFetch, parseJsonOrThrow } from '../../api/httpClient'

const allowedExtensions = ['.txt', '.pdf']

function isAllowedDocumentFile(f) {
  if (!f?.name) return false
  const lower = f.name.toLowerCase()
  return allowedExtensions.some(ext => lower.endsWith(ext))
}

export default function DocumentsSection({ discipline = '', subarea = '' }) {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [docs, setDocs] = useState([])
  const [examples, setExamples] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingEx, setLoadingEx] = useState(false)

  const loadDocs = async () => {
    const res = await apiFetch('/documents')
    const data = await parseJsonOrThrow(res, 'Não foi possível carregar documentos.')
    setDocs(data)
  }

  useEffect(() => {
    ;(async () => {
      try {
        await loadDocs()
      } catch (err) {
        console.error(err)
        setStatus(err.message)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleFileChange = e => {
    const f = e.target.files?.[0]
    if (f && !isAllowedDocumentFile(f)) {
      setStatus('Use apenas arquivo .txt ou .pdf.')
      e.target.value = ''
      setFile(null)
      return
    }
    setFile(f || null)
    if (f) setStatus('')
  }

  const handleUpload = async e => {
    e.preventDefault()
    if (!file || !discipline || !subarea) return
    if (!isAllowedDocumentFile(file)) {
      setStatus('Use apenas arquivo .txt ou .pdf.')
      return
    }
    setStatus('Enviando...')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('discipline', discipline)
      form.append('subarea', subarea)

      const res = await apiFetch('/upload', { method: 'POST', body: form })
      const j = await parseJsonOrThrow(res, 'Erro ao enviar documento.')
      setStatus(j.status || 'Upload completo!')
      await loadDocs()
      setFile(null)
    } catch (err) {
      console.error(err)
      setStatus(err.message || 'Erro ao enviar')
    }
  }

  const loadExamples = async doc => {
    setSelectedDoc(doc)
    setExamples([])
    setLoadingEx(true)
    try {
      const res = await apiFetch(
        `/documents/${doc.id}/examples?phase=session`
      )
      const data = await parseJsonOrThrow(res, 'Não foi possível carregar exemplos.')
      const formatted = data.map(item => ({
        question_id: item.id,
        messages: [
          { role: 'system', content: '' },
          { role: 'user', content: item.question },
          { role: 'assistant', content: JSON.stringify(item) },
        ],
      }))
      setExamples(formatted)
    } catch (err) {
      console.error(err)
      setStatus(err.message)
    } finally {
      setLoadingEx(false)
    }
  }

  const deleteExample = async questionId => {
    if (!selectedDoc) return
    if (!window.confirm('Remover este exemplo definitivamente?')) return

    try {
      const res = await apiFetch(
        `/documents/${selectedDoc.id}/examples/${questionId}?phase=session`,
        { method: 'DELETE' }
      )
      if (res.status !== 204) throw new Error('Erro ao remover exemplo')
      setExamples(prev => prev.filter(e => e.question_id !== questionId))
    } catch (err) {
      console.error(err)
      alert(err.message || 'Erro ao remover exemplo')
    }
  }

  const generateExamples = async () => {
    if (!selectedDoc) return
    setLoadingEx(true)
    setStatus('Agendando geração de exemplos...')
    try {
      const res = await apiFetch('/examples', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          discipline: selectedDoc.discipline,
          subarea: selectedDoc.subarea,
          filename: selectedDoc.filename,
        }),
      })
      const json = await parseJsonOrThrow(res, 'Erro ao agendar exemplos.')
      setStatus(json.status || 'Processamento iniciado')
      setTimeout(() => loadExamples(selectedDoc), 3000)
    } catch (err) {
      console.error(err)
      setStatus(err.message || 'Erro ao agendar exemplos')
    } finally {
      setLoadingEx(false)
    }
  }

  if (loading) return <p style={sectionStyles.muted}>Carregando documentos…</p>

  return (
    <div>
      <section style={{ marginBottom: 32 }}>
        <h3 style={sectionStyles.heading}>Enviar documento</h3>
        <p style={sectionStyles.hint}>
          Envie PDF ou TXT para gerar questões de matemática (processamento em background).
        </p>
        <form onSubmit={handleUpload} style={sectionStyles.form}>
          <p style={sectionStyles.contextNote}>
            {discipline && subarea ? (
              <>
                Enviando para: <strong>{discipline}</strong> / <strong>{subarea}</strong>
                <span style={sectionStyles.contextHint}>
                  {' '}(definido nos filtros acima)
                </span>
              </>
            ) : (
              <span style={sectionStyles.contextWarn}>
                Selecione disciplina e subárea nos filtros acima antes de enviar.
              </span>
            )}
          </p>

          <label style={sectionStyles.label}>
            Arquivo (.txt ou .pdf)
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              onChange={handleFileChange}
              required
              style={sectionStyles.input}
            />
          </label>

          <button
            type="submit"
            disabled={!file || !discipline || !subarea}
            style={{
              ...sectionStyles.primaryBtn,
              opacity: !file || !discipline || !subarea ? 0.6 : 1,
            }}
          >
            Enviar
          </button>
        </form>
        {!!status && <p style={sectionStyles.status}>{status}</p>}
      </section>

      <section style={{ marginBottom: 32 }}>
        <h3 style={sectionStyles.heading}>Seus documentos</h3>
        {docs.length === 0 ? (
          <p style={sectionStyles.muted}>Nenhum documento enviado ainda.</p>
        ) : (
          <div style={sectionStyles.grid}>
            {docs.map(d => (
              <button
                key={d.id}
                type="button"
                onClick={() => loadExamples(d)}
                style={{
                  ...sectionStyles.docCard,
                  borderColor: selectedDoc?.id === d.id ? '#00796b' : '#ccc',
                }}
              >
                <strong>{d.filename}</strong>
                <span style={sectionStyles.meta}>
                  {new Date(d.created_at).toLocaleString()}
                </span>
                <span style={sectionStyles.meta}>{d.discipline} / {d.subarea}</span>
              </button>
            ))}
          </div>
        )}
      </section>

      {selectedDoc && (
        <section>
          <h3 style={sectionStyles.heading}>
            Exemplos (sessão): {selectedDoc.filename}
          </h3>
          <button
            type="button"
            onClick={generateExamples}
            disabled={loadingEx}
            style={sectionStyles.secondaryBtn}
          >
            Gerar mais exemplos
          </button>

          {loadingEx ? (
            <p style={sectionStyles.muted}>Carregando exemplos…</p>
          ) : examples.length === 0 ? (
            <p style={sectionStyles.muted}>Sem exemplos para este documento.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 }}>
              {examples.map((ex, i) => {
                const userMsg = ex.messages[1].content
                const assistant = JSON.parse(ex.messages[2].content)
                const { math_reasoning, math_formula, math_solution, alternatives = [] } = assistant

                return (
                  <details key={i} style={sectionStyles.exampleCard}>
                    <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                      {userMsg}
                    </summary>
                    <button
                      type="button"
                      onClick={() => deleteExample(ex.question_id)}
                      style={sectionStyles.dangerBtn}
                    >
                      Excluir exemplo
                    </button>
                    <div style={{ marginTop: 8 }}>
                      <strong>Raciocínio:</strong>
                      <pre style={sectionStyles.pre}>{math_reasoning}</pre>
                      <strong>Fórmula:</strong>
                      <pre style={sectionStyles.pre}>{JSON.stringify(math_formula, null, 2)}</pre>
                      <strong>Solução:</strong>
                      <pre style={sectionStyles.pre}>{math_solution}</pre>
                      <strong>Alternativas:</strong>
                      <ul>
                        {alternatives.map((alt, idx) => (
                          <li
                            key={idx}
                            style={{ fontWeight: alt === math_solution ? 'bold' : 'normal' }}
                          >
                            {alt}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </details>
                )
              })}
            </div>
          )}
        </section>
      )}
    </div>
  )
}

const sectionStyles = {
  heading: { color: '#00796b', marginBottom: 12, fontSize: 18 },
  hint: { color: '#666', fontSize: 14, marginBottom: 16 },
  contextNote: { fontSize: 14, marginBottom: 4, color: '#333' },
  contextHint: { color: '#888', fontWeight: 'normal' },
  contextWarn: { color: '#e65100' },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    background: '#fff8e1',
    padding: 20,
    borderRadius: 12,
    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
  },
  label: { display: 'flex', flexDirection: 'column', gap: 4, fontWeight: 'bold', fontSize: 14 },
  input: { padding: 8, borderRadius: 6, border: '1px solid #ccc', fontSize: 15 },
  primaryBtn: {
    padding: 12,
    backgroundColor: '#4caf50',
    color: '#fff',
    fontSize: 16,
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  secondaryBtn: {
    marginBottom: 12,
    padding: 8,
    backgroundColor: '#fdd835',
    border: 'none',
    borderRadius: 6,
    cursor: 'pointer',
  },
  dangerBtn: {
    padding: '6px 10px',
    background: '#e53935',
    color: 'white',
    border: 'none',
    borderRadius: 6,
    marginTop: 8,
    cursor: 'pointer',
  },
  status: { marginTop: 10, textAlign: 'center', color: '#333' },
  muted: { color: '#666' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: 12,
  },
  docCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
    padding: 12,
    border: '2px solid #ccc',
    borderRadius: 8,
    background: '#fafafa',
    cursor: 'pointer',
    textAlign: 'left',
  },
  meta: { fontSize: 12, color: '#666' },
  exampleCard: {
    border: '1px solid #ddd',
    borderRadius: 8,
    padding: 12,
    background: '#fff',
  },
  pre: { background: '#f5f5f5', padding: 8, whiteSpace: 'pre-wrap', fontSize: 13 },
}
