// src/pages/Upload.js
import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [status, setStatus] = useState('')
  const [docs, setDocs] = useState([])
  const [examples, setExamples] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [loadingEx, setLoadingEx] = useState(false)
  const navigate = useNavigate()

  // carrega lista de documentos
  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        const res   = await fetch('http://localhost:8080/api/documents', {
          headers: { Authorization: 'Bearer ' + token }
        })
        const list  = await res.json()
        setDocs(list)
      } catch (err) {
        console.error(err)
      } finally {
        setLoadingDocs(false)
      }
    })()
  }, [])

  // handler de upload
  const handleUpload = async e => {
    e.preventDefault()
    if (!file) return
    setStatus('Enviando...')
    try {
      const token = await auth.currentUser.getIdToken()
      const form  = new FormData()
      form.append('file', file)
      form.append('discipline', 'Matemática')
      form.append('subarea', 'Geometria')

      const res = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form
      })
      const j   = await res.json()
      setStatus(j.status || 'Upload completo!')

      // recarrega docs
      const docsRes = await fetch('http://localhost:8080/api/documents', {
        headers: { Authorization: 'Bearer ' + token }
      })
      setDocs(await docsRes.json())
    } catch (err) {
      console.error(err)
      setStatus('Erro ao enviar')
    }
  }

  // carrega exemplos para um documento
  const loadExamples = async docId => {
    setSelectedDoc(docId)
    setExamples([])
    setLoadingEx(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const res   = await fetch(
        `http://localhost:8080/api/documents/${docId}/examples`,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      const data  = await res.json()
      setExamples(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingEx(false)
    }
  }

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: 'auto' }}>
      <button onClick={() => navigate('/')} style={{ marginBottom: 20 }}>
        ← Voltar ao Dashboard
      </button>

      <section style={{ marginBottom: 40 }}>
        <h2>Upload de Documento</h2>
        <form onSubmit={handleUpload} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <input
            type="file"
            accept=".txt"
            onChange={e => setFile(e.target.files[0])}
          />
          <button type="submit" style={{ padding: '6px 12px' }}>
            Enviar
          </button>
        </form>
        {!!status && <p style={{ marginTop: 10 }}>{status}</p>}
      </section>

      <section style={{ marginBottom: 40 }}>
        <h3>Seus Documentos</h3>
        {loadingDocs
          ? <p>Carregando documentos…</p>
          : docs.length === 0
            ? <p>Nenhum documento enviado ainda.</p>
            : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))',
                gap: 16
              }}>
                {docs.map(d => (
                  <div
                    key={d.id}
                    onClick={() => loadExamples(d.id)}
                    style={{
                      padding: 12,
                      border: selectedDoc === d.id ? '2px solid #007bff' : '1px solid #ccc',
                      borderRadius: 8,
                      cursor: 'pointer',
                      background: '#fafafa'
                    }}
                  >
                    <strong>{d.filename}</strong>
                    <div style={{ fontSize: 12, color: '#666', marginTop: 4 }}>
                      {new Date(d.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )
        }
      </section>

      {selectedDoc && (
        <section>
          <h3>Exemplos gerados</h3>
          {loadingEx
            ? <p>Carregando exemplos…</p>
            : examples.length === 0
              ? <p>Sem exemplos para este documento.</p>
              : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {examples.map((ex, i) => {
                    const userMsg = ex.messages[1].content
                    const assistant = JSON.parse(ex.messages[2].content)
                    return (
                      <details
                        key={i}
                        style={{
                          border: '1px solid #ddd',
                          borderRadius: 8,
                          padding: 12,
                          background: '#fff',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                        }}
                      >
                        <summary style={{ cursor: 'pointer', fontWeight: 'bold' }}>
                          {userMsg}
                        </summary>
                        <div style={{ marginTop: 8, paddingLeft: 12 }}>
                          <div style={{ marginBottom: 8 }}>
                            <strong>Raciocínio Matemático:</strong>
                            <pre style={{
                              margin: '4px 0',
                              whiteSpace: 'pre-wrap',
                              background: '#f5f5f5',
                              padding: 8,
                              borderRadius: 4
                            }}>
                              {assistant.math_reasoning}
                            </pre>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>Solução Matemática:</strong>
                            <pre style={{
                              margin: '4px 0',
                              whiteSpace: 'pre-wrap',
                              background: '#f5f5f5',
                              padding: 8,
                              borderRadius: 4
                            }}>
                              {assistant.math_solution}
                            </pre>
                          </div>
                          <div style={{ marginBottom: 8 }}>
                            <strong>Reasoning Scratch:</strong>
                            <pre style={{
                              margin: '4px 0',
                              whiteSpace: 'pre-wrap',
                              background: '#f5f5f5',
                              padding: 8,
                              borderRadius: 4
                            }}>
                              {assistant.scratch_reasoning}
                            </pre>
                          </div>
                          <div>
                            <strong>Solução em Scratch:</strong>
                            <pre style={{
                              margin: '4px 0',
                              whiteSpace: 'pre-wrap',
                              background: '#f5f5f5',
                              padding: 8,
                              borderRadius: 4
                            }}>
                              {JSON.stringify(assistant.scratch_solution, null, 2)}
                            </pre>
                          </div>
                        </div>
                      </details>
                    )
                  })}
                </div>
              )
          }
        </section>
      )}
    </div>
  )
}
