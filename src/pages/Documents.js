import React, { useState, useEffect } from 'react'
import { auth } from '../firebase'
import { useNavigate } from 'react-router-dom'

export default function Documents() {
  const [file, setFile] = useState(null)
  const [discipline, setDiscipline] = useState('')
  const [subarea, setSubarea] = useState('')
  const [status, setStatus] = useState('')
  const [docs, setDocs] = useState([])
  const [examples, setExamples] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [phase, setPhase] = useState('warmup')
  const [loading, setLoading] = useState(true)
  const [loadingEx, setLoadingEx] = useState(false)
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()
  const disciplineOptions = ['Matemática']

  useEffect(() => {
    ;(async () => {
      try {
        const token = await auth.currentUser.getIdToken()
        const [profileRes, docsRes] = await Promise.all([
          fetch('http://localhost:8080/api/me', { headers: { Authorization: 'Bearer ' + token } }),
          fetch('http://localhost:8080/api/documents', { headers: { Authorization: 'Bearer ' + token } })
        ])
        if (!profileRes.ok || !docsRes.ok) throw new Error('Falha ao carregar dados')
        setProfile(await profileRes.json())
        setDocs(await docsRes.json())
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const handleUpload = async e => {
    e.preventDefault()
    if (!file || !discipline || !subarea) return
    setStatus('Enviando...')
    try {
      const token = await auth.currentUser.getIdToken()
      const form = new FormData()
      form.append('file', file)
      form.append('discipline', discipline)
      form.append('subarea', subarea)

      const res = await fetch('http://localhost:8080/api/upload', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + token },
        body: form
      })
      const j = await res.json()
      setStatus(j.status || 'Upload completo!')

      const docsRes = await fetch('http://localhost:8080/api/documents', { headers: { Authorization: 'Bearer ' + token } })
      setDocs(await docsRes.json())
      setFile(null)
      setDiscipline('')
      setSubarea('')
    } catch (err) {
      console.error(err)
      setStatus('Erro ao enviar')
    }
  }

  const loadExamples = async (doc, phaseType = phase) => {
    setSelectedDoc(doc)
    setPhase(phaseType)
    setExamples([])
    setLoadingEx(true)
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch(
        `http://localhost:8080/api/documents/${doc.id}/examples?phase=${phaseType}`,
        { headers: { Authorization: 'Bearer ' + token } }
      )
      const data = await res.json()
      const formatted = data.map(item => ({
        messages: [
          { role: 'system',   content: '' },
          { role: 'user',     content: item.question },
          { role: 'assistant', content: JSON.stringify(item) }
        ]
      }))
      setExamples(formatted)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingEx(false)
    }
  }

  const generateExamples = async () => {
    if (!selectedDoc) return
    setLoadingEx(true)
    setStatus('Agendando geração de exemplos...')
    try {
      const token = await auth.currentUser.getIdToken()
      const res = await fetch('http://localhost:8080/api/examples', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          discipline: selectedDoc.discipline,
          subarea:    selectedDoc.subarea,
          filename:   selectedDoc.filename
        })
      })
      const json = await res.json()
      setStatus(json.status || 'Processamento iniciado')
      setTimeout(() => loadExamples(selectedDoc, phase), 3000)
    } catch (err) {
      console.error(err)
      setStatus('Erro ao agendar exemplos')
    } finally {
      setLoadingEx(false)
    }
  }

  if (loading) return <p style={{ padding:20, textAlign:'center', fontSize:18 }}>🔄 Carregando...</p>

  return (
    <div style={{ padding:20, maxWidth:800, margin:'auto', backgroundColor:'#e0f7fa', borderRadius:12 }}>
      <button onClick={() => navigate('/')} style={{ marginBottom:20, background:'transparent', border:'none', fontSize:18, cursor:'pointer' }}>
        ← Voltar ao Dashboard
      </button>

      <section style={{ marginBottom:40 }}>
        <h2 style={{ textAlign:'center', color:'#ff5722', marginBottom:20 }}>📂 Documentos</h2>
        <form onSubmit={handleUpload} style={{ display:'flex', flexDirection:'column', gap:16, backgroundColor:'#fff8e1', padding:20, borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.1)' }}>
          <div style={{ display:'flex', flexDirection:'column' }}>
            <label htmlFor="discipline" style={{ fontWeight:'bold', marginBottom:4 }}>Disciplina</label>
            <select id="discipline" value={discipline} onChange={e=>setDiscipline(e.target.value)} required style={{ padding:8, borderRadius:6, border:'1px solid #ccc', fontSize:16 }}>
              <option value="">Selecione...</option>
              {disciplineOptions.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          <div style={{ display:'flex', flexDirection:'column' }}>
            <label htmlFor="subarea" style={{ fontWeight:'bold', marginBottom:4 }}>Subárea</label>
            <input id="subarea" type="text" placeholder="Ex: Geometria" value={subarea} onChange={e=>setSubarea(e.target.value)} required style={{ padding:8, borderRadius:6, border:'1px solid #ccc', fontSize:16 }} />
          </div>

          <div style={{ display:'flex', flexDirection:'column' }}>
            <label htmlFor="file" style={{ fontWeight:'bold', marginBottom:4 }}>Arquivo (.txt)</label>
            <input id="file" type="file" accept=".txt" onChange={e=>setFile(e.target.files[0])} required style={{ padding:8 }} />
          </div>

          <button type="submit" disabled={!file||!discipline||!subarea} style={{ padding:12, backgroundColor:(!file||!discipline||!subarea)?'#ccc':'#4caf50', color:'#fff', fontSize:18, border:'none', borderRadius:6, cursor:(!file||!discipline||!subarea)?'not-allowed':'pointer' }}>
            Enviar
          </button>
        </form>
        {!!status && <p style={{ marginTop:10, textAlign:'center' }}>{status}</p>}
      </section>

      <section style={{ marginBottom:40 }}>
        <h3 style={{ color:'#00796b', marginBottom:16 }}>Seus Documentos</h3>
        {docs.length===0
          ? <p>Nenhum documento enviado ainda.</p>
          : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:16 }}>
              {docs.map(d => (
                <div key={d.id} onClick={()=>loadExamples(d)} style={{ padding:12, border:selectedDoc?.id===d.id?'2px solid #007bff':'1px solid #ccc', borderRadius:8, cursor:'pointer', background:'#fafafa', transition:'transform 0.1s' }} onMouseEnter={e=>e.currentTarget.style.transform='scale(1.02)'} onMouseLeave={e=>e.currentTarget.style.transform='scale(1)' }>
                  <strong style={{ fontSize:16 }}>{d.filename}</strong>
                  <div style={{ fontSize:12, color:'#666', marginTop:4 }}>{new Date(d.created_at).toLocaleString()}</div>
                  <div style={{ fontSize:12, color:'#444', marginTop:4 }}>{d.discipline} / {d.subarea}</div>
                </div>
              ))}
            </div>
          )}
      </section>

      {selectedDoc && (
        <section>
          <h3 style={{ color:'#00796b', marginBottom:16 }}>Exemplos para: {selectedDoc.filename}</h3>
          <div style={{ marginBottom:12, textAlign:'center' }}>
            <button onClick={()=>loadExamples(selectedDoc, 'warmup')} style={{ marginRight:8, padding:8, background:phase==='warmup'?'#4caf50':'#ccc', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>Warmup</button>
            <button onClick={()=>loadExamples(selectedDoc, 'session')} style={{ padding:8, background:phase==='session'?'#4caf50':'#ccc', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' }}>Session</button>
          </div>
          <button onClick={generateExamples} disabled={loadingEx} style={{ marginBottom:12, padding:8, backgroundColor:'#fdd835', border:'none', borderRadius:6, cursor:loadingEx?'not-allowed':'pointer' }}>🔄 Gerar mais exemplos</button>
          {loadingEx
            ? <p>Gerando exemplos...</p>
            : examples.length===0
              ? <p>Sem exemplos para este documento.</p>
              : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                  {examples.map((ex,i)=>{
                    const userMsg = ex.messages[1].content
                    const assistant = JSON.parse(ex.messages[2].content)
                    const { math_reasoning, math_solution, scratch_reasoning, scratch_solution, alternatives=[] } = assistant
                    return (
                      <details key={i} style={{ border:'1px solid #ddd', borderRadius:8, padding:12, background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.1)' }}>
                        <summary style={{ cursor:'pointer', fontWeight:'bold', fontSize:16 }}>{userMsg}</summary>
                        <div style={{ marginTop:8, paddingLeft:12 }}>
                          <div style={{ marginBottom:8 }}>
                            <strong>Raciocínio Matemático:</strong>
                            <pre style={{ margin:'4px 0', whiteSpace:'pre-wrap', background:'#f5f5f5', padding:8, borderRadius:4 }}>{math_reasoning}</pre>
                          </div>
                          <div style={{ marginBottom:8 }}>
                            <strong>Solução Matemática:</strong>
                            <pre style={{ margin:'4px 0', whiteSpace:'pre-wrap', background:'#f5f5f5', padding:8, borderRadius:4 }}>{math_solution}</pre>
                          </div>
                          <div style={{ marginBottom:8 }}>
                            <strong>Alternativas:</strong>
                            <ul style={{ margin:'4px 0', paddingLeft:20 }}>
                              {alternatives.map((alt,idx)=><li key={idx} style={{ fontWeight:alt===math_solution?'bold':'normal', color:alt===math_solution?'#007bff':'#000', fontSize:16 }}>{alt}</li>)}
                            </ul>
                          </div>
                          <div style={{ marginBottom:8 }}>
                            <strong>Reasoning Scratch:</strong>
                            <pre style={{ margin:'4px 0', whiteSpace:'pre-wrap', background:'#f5f5f5', padding:8, borderRadius:4 }}>{scratch_reasoning}</pre>
                          </div>
                          <div>
                            <strong>Solução em Scratch:</strong>
                            <pre style={{ margin:'4px 0', whiteSpace:'pre-wrap', background:'#f5f5f5', padding:8, borderRadius:4 }}>{JSON.stringify(scratch_solution,null,2)}</pre>
                          </div>
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