// src/pages/Upload.js
import React, { useState, useEffect } from 'react';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const [docs, setDocs] = useState([]);
  const [examples, setExamples] = useState([]);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const navigate = useNavigate();

  // 1) busca lista de documentos no mount
  useEffect(() => {
    (async () => {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('http://localhost:8080/api/documents', {
        headers: { Authorization: 'Bearer ' + token }
      });
      const list = await res.json();
      setDocs(list);
    })();
  }, []);

  // 2) quando o usuário clica num documento, baixa os exemplos
  const loadExamples = async (docId) => {
    setSelectedDoc(docId);
    setExamples([]); // limpa
    const token = await auth.currentUser.getIdToken();
    const res = await fetch(`http://localhost:8080/api/documents/${docId}/examples`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    const data = await res.json();
    setExamples(data);
  };

  // 3) função de upload
  const handleUpload = async e => {
    e.preventDefault();
    if (!file) return;
    setStatus('Enviando...');
    const token = await auth.currentUser.getIdToken();
    const form = new FormData();
    form.append('file', file);
    form.append('discipline', 'Matemática');
    form.append('subarea', 'Geometria');
    const res = await fetch('http://localhost:8080/api/upload', {
      method: 'POST',
      headers: { Authorization: 'Bearer '+token },
      body: form
    });
    const j = await res.json();
    setStatus(j.status || JSON.stringify(j));
    // recarrega lista de docs
    const docsRes = await fetch('http://localhost:8080/api/documents', {
      headers: { Authorization: 'Bearer ' + token }
    });
    setDocs(await docsRes.json());
  };

  return (
    <div style={{ padding: 20 }}>
      <h2>Upload de Documento</h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".txt" onChange={e=>setFile(e.target.files[0])}/>
        <button type="submit">Enviar</button>
      </form>
      <pre>{status}</pre>

      <h3>Seus Documentos</h3>
      <ul>
        {docs.map(d => (
          <li key={d.id}>
            <button onClick={()=>loadExamples(d.id)}>
              {d.filename} ({new Date(d.created_at).toLocaleString()})
            </button>
          </li>
        ))}
      </ul>

      {selectedDoc && (
        <div>
          <h4>Exemplos gerados para: {selectedDoc}</h4>
          <ul>
            {examples.map((ex, i) => (
              <li key={i}>
                <pre style={{ whiteSpace: 'pre-wrap' }}>
                  {JSON.stringify(ex.messages || ex, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
