import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function NewGameForm() {
  // Hooks
  const [user, loadingAuth] = useAuthState(auth);
  const [name, setName] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [gameFile, setGameFile] = useState(null);
  const [hasOptions, setHasOptions] = useState(false);
  const [hasWarmup, setHasWarmup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Dropzone
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'image/png': ['.png'],
      'image/jpeg': ['.jpg'],
      'application/zip': ['.zip']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024,
    onDropRejected: rejections =>
      rejections.forEach(r => toast.error(`Erro: ${r.errors[0].message}`))
  });

  if (loadingAuth) {
    return <p style={{ textAlign: 'center', padding: 20 }}>Carregando…</p>;
  }

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name || !iconFile || !gameFile) {
      toast.error('Por favor preencha todos os campos e selecione os arquivos.');
      return;
    }
    setLoading(true);
    setProgress(0);
    try {
      const token = await auth.currentUser.getIdToken();
      // 1) Obter URLs assinadas
      const urlsRes = await fetch('/api/games/upload-urls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ iconName: iconFile.name, gameName: gameFile.name })
      });
      if (!urlsRes.ok) throw new Error('Não foi possível obter URLs');
      const { icon_url, game_url } = await urlsRes.json();

      // 2) Upload de arquivos
      await axios.put(icon_url, iconFile, {
        headers: { 'Content-Type': iconFile.type },
        onUploadProgress: evt =>
          setProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      await axios.put(game_url, gameFile, {
        headers: { 'Content-Type': gameFile.type },
        onUploadProgress: evt =>
          setProgress(Math.round((evt.loaded * 100) / evt.total))
      });

      // 3) Criar registro de jogo
      const createRes = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          icon_url,
          path: game_url,
          has_options: hasOptions,
          has_warmup: hasWarmup
        })
      });
      if (!createRes.ok) throw new Error('Erro ao criar jogo');
      toast.success('Jogo criado com sucesso!');
      navigate('/admin');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>
        ← Voltar
      </button>
      <h2 style={styles.heading}>🎮 Novo Jogo</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Nome</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          style={styles.input}
        />

        <label style={styles.label}>Ícone (.png, .jpg)</label>
        <div {...getRootProps()} style={styles.dropzone}>
          <input
            {...getInputProps()}
            onChange={e => setIconFile(e.target.files[0])}
          />
          {isDragActive
            ? 'Solte o arquivo aqui…'
            : 'Clique ou arraste o ícone'}
        </div>

        <label style={styles.label}>Arquivo do Jogo (.zip)</label>
        <div {...getRootProps()} style={styles.dropzone}>
          <input
            {...getInputProps()}
            onChange={e => setGameFile(e.target.files[0])}
          />
          {isDragActive
            ? 'Solte o .zip aqui…'
            : 'Clique ou arraste o .zip'}
        </div>

        <div style={styles.checkboxRow}>
          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hasWarmup}
              onChange={e => setHasWarmup(e.target.checked)}
            />
            Possui warmup
            <span style={styles.infoText}>
              necessário realizar alguma atividade antes de jogar (por exemplo, resolver um problema usando scratch)
            </span>
          </label>

          <label style={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={hasOptions}
              onChange={e => setHasOptions(e.target.checked)}
            />
            Precisa de opções
            <span style={styles.infoText}>
              necessário configurar com as opções de disciplina (Matemática, ...) e subárea (como Aritmética, ...)
            </span>
          </label>
        </div>

        {progress > 0 && (
          <progress value={progress} max="100" style={styles.progress}>
            {progress}%
          </progress>
        )}

        <button
          type="submit"
          disabled={loading}
          style={styles.createButton}
        >
          {loading ? 'Criando…' : 'Criar Jogo'}
        </button>
      </form>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
    </div>
  );
}

const styles = {
  container: { maxWidth: 960, margin: '40px auto', padding: 32, backgroundColor: '#fff8f0', borderRadius: 12, boxShadow: '0 0 10px rgba(0,0,0,0.1)' },
  backButton: { background: 'transparent', border: 'none', fontSize: 16, color: '#333', marginBottom: 16, cursor: 'pointer' },
  heading: { textAlign: 'center', marginBottom: 24, color: '#6a1b9a' },
  form: { display: 'flex', flexDirection: 'column', gap: 16 },
  label: { fontSize: 14, color: '#4a148c' },
  input: { padding: 8, fontSize: 14, borderRadius: 6, border: '1px solid #aaa' },
  dropzone: { padding: 20, border: '2px dashed #ccc', borderRadius: 6, textAlign: 'center', backgroundColor: '#eee', cursor: 'pointer' },
  checkboxRow: { display: 'flex', flexDirection: 'column', gap: 12 },
  checkboxLabel: { display: 'flex', flexDirection: 'column', fontSize: 14, color: '#555' },
  infoText: { fontSize: 12, color: '#777', marginLeft: 24, marginTop: 4 },
  progress: { width: '100%', marginTop: 8 },
  createButton: { padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }
};
