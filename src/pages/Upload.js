import React, { useState } from 'react';
import { auth } from '../firebase';

export default function Upload() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState('');
  const handleUpload = async e => {
    e.preventDefault();
    if (!file) return;
    setStatus('Enviando...');
    const token = await auth.currentUser.getIdToken();
    const form = new FormData();
    form.append('file', file);
    form.append('discipline', 'Matemática');
    form.append('subarea', 'Geometria');
    const res = await fetch('/api/upload', { method: 'POST', headers: { Authorization: 'Bearer '+token }, body: form });
    const j = await res.json();
    setStatus(j.status || JSON.stringify(j));
  };
  return (
    <div>
      <h2>Upload de Documento</h2>
      <form onSubmit={handleUpload}>
        <input type="file" accept=".txt" onChange={e=>setFile(e.target.files[0])}/>
        <button type="submit">Enviar</button>
      </form>
      <pre>{status}</pre>
    </div>
  );
}