import React, { useState, useEffect } from 'react'
import {
  LuUpload, LuFileText, LuSparkles, LuTrash2, LuInbox, LuRefreshCw,
} from 'react-icons/lu'
import { apiFetch, parseJsonOrThrow } from '../../api/httpClient'
import { Card, Button, Field, Alert, Badge, EmptyState, Loader } from '../../components/ui'

const allowedExtensions = ['.txt', '.pdf']

function isAllowedDocumentFile(f) {
  if (!f?.name) return false
  const lower = f.name.toLowerCase()
  return allowedExtensions.some(ext => lower.endsWith(ext))
}

export default function DocumentsSection({
  discipline = '',
  subarea = '',
  onContentChanged,
}) {
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
      onContentChanged?.()
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

  if (loading) return <Loader label="Carregando documentos…" />

  const contextReady = discipline && subarea

  return (
    <div className="a2l-stack" style={{ gap: 32 }}>
      <section>
        <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 6 }}>Enviar documento</h3>
        <p className="a2l-hint" style={{ marginBottom: 16 }}>
          Envie PDF ou TXT para gerar questões de matemática. O processamento acontece em segundo plano.
        </p>

        <Card quiet as="form" onSubmit={handleUpload} style={{ padding: 20 }}>
          {contextReady ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <span className="a2l-eyebrow-sm">Enviando para</span>
              <Badge tone="brand">{discipline}</Badge>
              <Badge tone="mint">{subarea}</Badge>
            </div>
          ) : (
            <Alert tone="warning" style={{ marginBottom: 16 }}>
              Selecione disciplina e subárea no contexto acima antes de enviar.
            </Alert>
          )}

          <Field label="Arquivo (.txt ou .pdf)" required>
            <input
              type="file"
              accept=".txt,.pdf,text/plain,application/pdf"
              onChange={handleFileChange}
              required
              className="a2l-file"
            />
          </Field>

          <Button
            type="submit"
            icon={<LuUpload size={17} />}
            disabled={!file || !contextReady}
            style={{ marginTop: 16 }}
          >
            Enviar documento
          </Button>

          {!!status && <p className="a2l-hint" style={{ marginTop: 12 }}>{status}</p>}
        </Card>
      </section>

      <section>
        <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 14 }}>Seus documentos</h3>
        {docs.length === 0 ? (
          <Card quiet>
            <EmptyState
              icon={<LuInbox size={22} />}
              title="Nenhum documento enviado"
              description="Envie um PDF ou TXT acima para gerar questões automaticamente."
            />
          </Card>
        ) : (
          <div className="a2l-grid a2l-grid--wide">
            {docs.map(d => (
              <Card
                key={d.id}
                interactive
                selected={selectedDoc?.id === d.id}
                onClick={() => loadExamples(d)}
                role="button"
                tabIndex={0}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && loadExamples(d)}
                style={{ padding: 16 }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span className="a2l-icon-chip a2l-icon-chip--neutral" style={{ width: 34, height: 34, borderRadius: 11 }}>
                    <LuFileText size={17} />
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontFamily: 'var(--a2l-font-display)', fontWeight: 700,
                        color: 'var(--a2l-ink-900)', overflow: 'hidden',
                        textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                      title={d.filename}
                    >
                      {d.filename}
                    </div>
                    <div className="a2l-hint" style={{ marginTop: 2 }}>
                      {new Date(d.created_at).toLocaleString('pt-BR')}
                    </div>
                    <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
                      <Badge tone="neutral">{d.discipline}</Badge>
                      <Badge tone="neutral">{d.subarea}</Badge>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </section>

      {selectedDoc && (
        <section className="a2l-anim-in">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
            <h3 style={{ fontSize: 'var(--a2l-text-lg)', flex: 1, minWidth: 200 }}>
              Exemplos de <span style={{ color: 'var(--a2l-brand-600)' }}>{selectedDoc.filename}</span>
            </h3>
            <Button
              variant="soft"
              size="sm"
              icon={loadingEx ? <LuRefreshCw size={14} /> : <LuSparkles size={14} />}
              onClick={generateExamples}
              disabled={loadingEx}
            >
              Gerar mais exemplos
            </Button>
          </div>

          {loadingEx ? (
            <Loader label="Carregando exemplos…" />
          ) : examples.length === 0 ? (
            <Card quiet>
              <EmptyState
                icon={<LuSparkles size={22} />}
                title="Sem exemplos para este documento"
                description="Use “Gerar mais exemplos” para criar questões a partir deste conteúdo."
              />
            </Card>
          ) : (
            <div className="a2l-stack" style={{ gap: 10 }}>
              {examples.map((ex, i) => {
                const userMsg = ex.messages[1].content
                const assistant = JSON.parse(ex.messages[2].content)
                const { math_reasoning, math_formula, math_solution, alternatives = [] } = assistant

                return (
                  <details key={i} className="a2l-details">
                    <summary>{userMsg}</summary>
                    <div className="a2l-details__body">
                      <div className="a2l-eyebrow-sm">Raciocínio</div>
                      <pre className="a2l-pre">{math_reasoning}</pre>

                      <div className="a2l-eyebrow-sm">Fórmula</div>
                      <pre className="a2l-pre">{JSON.stringify(math_formula, null, 2)}</pre>

                      <div className="a2l-eyebrow-sm">Solução</div>
                      <pre className="a2l-pre">{math_solution}</pre>

                      <div className="a2l-eyebrow-sm">Alternativas</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
                        {alternatives.map((alt, idx) => (
                          <Badge key={idx} tone={alt === math_solution ? 'success' : 'neutral'}>
                            {alt}
                          </Badge>
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        icon={<LuTrash2 size={14} />}
                        onClick={() => deleteExample(ex.question_id)}
                        style={{ marginTop: 16, color: 'var(--a2l-danger)' }}
                      >
                        Excluir exemplo
                      </Button>
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
