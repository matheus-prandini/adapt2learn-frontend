import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import axios from 'axios';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function NewGameForm() {
  const [user, loadingAuth] = useAuthState(auth);
  const [name, setName] = useState('');
  const [iconFile, setIconFile] = useState(null);
  const [gameFile, setGameFile] = useState(null);
  const [hasOptions, setHasOptions] = useState(false);
  const [hasWarmup, setHasWarmup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  // Dropzone: ícone
  const {
    getRootProps: getIconRootProps,
    getInputProps: getIconInputProps,
    isDragActive: isIconDragActive
  } = useDropzone({
    accept: { 'image/png': ['.png'], 'image/jpeg': ['.jpg'] },
    multiple: false,
    maxSize: 10 * 1024 * 1024,
    onDrop: accepted => setIconFile(accepted[0]),
    onDropRejected: rejections => rejections.forEach(r => toast.error(`Erro: ${r.errors[0].message}`))
  });

  // Dropzone: zip do jogo
  const {
    getRootProps: getGameRootProps,
    getInputProps: getGameInputProps,
    isDragActive: isGameDragActive
  } = useDropzone({
    accept: {
      'application/zip': ['.zip'],
      'application/x-zip-compressed': ['.zip'],
      'multipart/x-zip': ['.zip']
    },
    multiple: false,
    maxSize: 100 * 1024 * 1024,
    onDrop: accepted => {
      console.log("Arquivo aceito:", accepted[0]);
      setGameFile(accepted[0]);
    },
    onDropRejected: rejections => {
      console.log("Rejeitado:", rejections);
      rejections.forEach(r =>
        toast.error(`Erro: ${r.errors[0].message}`)
      );
    }
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

      // 1) Criar o jogo
      const createRes = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, has_options: hasOptions, has_warmup: hasWarmup })
      });
      if (!createRes.ok) throw new Error('Erro ao criar jogo');
      const { id: gameId } = await createRes.json();

      // 2) Upload do ícone
      const iconUrlRes = await fetch(
        `/api/games/${gameId}/icon/upload-url?filename=${encodeURIComponent(iconFile.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!iconUrlRes.ok) throw new Error('Erro ao obter URL do ícone');
      const { upload_url: iconUploadUrl, object_path } = await iconUrlRes.json();
      await axios.put(iconUploadUrl, iconFile, {
        headers: { 'Content-Type': iconFile.type },
        onUploadProgress: evt => setProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      const patchRes = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ icon_url: object_path })
      });
      if (!patchRes.ok) throw new Error('Erro ao atualizar ícone');

      // 3) Deploy do ZIP
      const deployUrlRes = await fetch(
        `/api/games/${gameId}/deploys/upload-url?filename=${encodeURIComponent(gameFile.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!deployUrlRes.ok) throw new Error('Erro ao obter URL de deploy');
      const { upload_url: zipUploadUrl, version } = await deployUrlRes.json();
      await axios.put(zipUploadUrl, gameFile, {
        headers: { 'Content-Type': gameFile.type },
        onUploadProgress: evt => setProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      const regRes = await fetch(`/api/games/${gameId}/deploys/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ version, download_url: zipUploadUrl, notes: '' })
      });
      if (!regRes.ok) throw new Error('Erro ao registrar deploy');

      toast.success('Jogo criado com sucesso!');
      navigate('/admin');
    } catch (err) {
      console.log("[HandleSubmit] catch");
      toast.error(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.backButton}>← Voltar</button>
      <h2 style={styles.heading}>🎮 Novo Jogo</h2>
      <form onSubmit={handleSubmit} style={styles.form}>
        <label style={styles.label}>Nome</label>
        <input value={name} onChange={e => setName(e.target.value)} style={styles.input} />

        <label style={styles.label}>Ícone (.png, .jpg)</label>
        <div {...getIconRootProps()} style={styles.dropzone}>
          <input {...getIconInputProps()} />
          {isIconDragActive
            ? 'Solte o ícone aqui…'
            : iconFile
            ? iconFile.name
            : 'Clique ou arraste o ícone (.png/.jpg)'}
        </div>

        <label style={styles.label}>Arquivo do Jogo (.zip)</label>
        <div {...getGameRootProps()} style={styles.dropzone}>
          <input {...getGameInputProps()} />
          {isGameDragActive
            ? 'Solte o .zip aqui…'
            : gameFile
            ? gameFile.name
            : 'Clique ou arraste o .zip'}
        </div>

        <div style={styles.checkboxRow}>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={hasWarmup} onChange={e => setHasWarmup(e.target.checked)} />
            Possui warmup
            <span style={styles.infoText}>necessário atividade antes de jogar</span>
          </label>
          <label style={styles.checkboxLabel}>
            <input type="checkbox" checked={hasOptions} onChange={e => setHasOptions(e.target.checked)} />
            Precisa de opções
            <span style={styles.infoText}>configurar disciplina e subárea</span>
          </label>
        </div>

        {progress > 0 && <progress value={progress} max="100" style={styles.progress}>{progress}%</progress>}
        <button type="submit" disabled={loading} style={styles.createButton}>
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
  checkboxLabel: { fontSize: 14, color: '#555' },
  infoText: { fontSize: 12, color: '#777', marginLeft: 24, marginTop: 4 },
  progress: { width: '100%', marginTop: 8 },
  createButton: { padding: '10px 20px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }
};
