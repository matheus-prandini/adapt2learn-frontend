import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Custom confirmation modal
function ConfirmModal({ isOpen, title, message, onConfirm, onCancel }) {
  if (!isOpen) return null;
  return (
    <div style={modalStyles.overlay} role="dialog" aria-modal="true">
      <div style={modalStyles.modal}>
        <h2>{title}</h2>
        <p>{message}</p>
        <div style={modalStyles.buttons}>
          <button onClick={onCancel} style={modalStyles.cancelBtn}>Cancelar</button>
          <button onClick={onConfirm} style={modalStyles.confirmBtn}>Confirmar</button>
        </div>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: 'fixed', top:0, left:0, right:0, bottom:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 },
  modal: { background:'#fff', padding:24, borderRadius:8, maxWidth:400, width:'90%' },
  buttons: { display:'flex', justifyContent:'flex-end', gap:8, marginTop:16 },
  cancelBtn: { background:'#ccc', border:'none', padding:'8px 16px', borderRadius:4, cursor:'pointer' },
  confirmBtn: { background:'#28a745', color:'#fff', border:'none', padding:'8px 16px', borderRadius:4, cursor:'pointer' }
};

export default function GameDetails() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();

  const [gameInfo, setGameInfo] = useState(null);
  const [deploys, setDeploys] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [confirmingVersion, setConfirmingVersion] = useState(null);
  const [buildOp, setBuildOp] = useState(null);
  const [buildStatus, setBuildStatus] = useState('');

  // Polling states
  const [listPollVersion, setListPollVersion] = useState(null);
  const listPollRef = useRef(null);
  const [gamePollVersion, setGamePollVersion] = useState(null);
  const gamePollRef = useRef(null);

  // Dropzone: accept only .zip
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: { 'application/zip': ['.zip'] },
    multiple: false,
    maxSize: 50 * 1024 * 1024,
    onDropRejected: rejections => rejections.forEach(r => toast.error(`Erro: ${r.errors[0].message}`))
  });
  const file = acceptedFiles[0] || null;

  // Fetch game metadata
  const fetchGame = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/games', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao carregar jogos');
      const list = await res.json();
      setGameInfo(list.find(g => g.id === gameId));
    } catch (err) {
      toast.error(err.message);
    }
  };
  useEffect(() => { fetchGame(); }, [gameId]);

  // Fetch deploy history
  const fetchDeploys = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/games/${gameId}/deploys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar deploys');
      const data = await res.json();
      setDeploys(data);
      return data;
    } catch (err) {
      toast.error(err.message);
      return [];
    }
  };
  useEffect(() => { fetchDeploys(); }, [gameId]);

  // Poll for new deploy in list
  useEffect(() => {
    if (!listPollVersion) return;
    clearInterval(listPollRef.current);
    listPollRef.current = setInterval(async () => {
      const data = await fetchDeploys();
      if (data.some(d => d.version === listPollVersion)) {
        toast.success(`Deploy ${listPollVersion} adicionado à lista!`);
        clearInterval(listPollRef.current);
        setListPollVersion(null);
        setGamePollVersion(listPollVersion);
      }
    }, 5000);
    return () => clearInterval(listPollRef.current);
  }, [listPollVersion]);

  // Poll for activation in game meta
  useEffect(() => {
    if (!gamePollVersion) return;
    clearInterval(gamePollRef.current);
    gamePollRef.current = setInterval(async () => {
      await fetchGame();
      if (gameInfo?.active_version === gamePollVersion) {
        toast.success(`Versão ${gamePollVersion} agora está ativa!`);
        clearInterval(gamePollRef.current);
        setGamePollVersion(null);
      }
    }, 5000);
    return () => clearInterval(gamePollRef.current);
  }, [gamePollVersion, gameInfo]);

  // Handle deploy: upload + register
  const handleDeploy = async () => {
    if (!file) return toast.warn('Selecione um arquivo .zip válido.');
    setLoading(true);
    setUploadProgress(0);
    try {
      const token = await auth.currentUser.getIdToken();
      // 1) Signed URL
      const urlRes = await fetch(
        `/api/games/${gameId}/deploys/upload-url?filename=${encodeURIComponent(file.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!urlRes.ok) throw new Error('Não foi possível obter URL de upload');
      const { upload_url, version } = await urlRes.json();
      // 2) Upload
      await axios.put(upload_url, file, {
        headers: { 'Content-Type': 'application/zip' },
        onUploadProgress: evt => setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      // 3) Register
      const regRes = await fetch(`/api/games/${gameId}/deploys/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version, download_url: upload_url, notes })
      });
      if (!regRes.ok) throw new Error('Falha ao registrar deploy');
      toast.info('Deploy registrado! Aguardando listagem...');
      setListPollVersion(version);
      setNotes('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Manual activation
  const confirmActivate = version => setConfirmingVersion(version);
  const onConfirmActivate = async () => {
    const version = confirmingVersion;
    setConfirmingVersion(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/games/${gameId}/activate/${version}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Falha ao ativar versão');
      const { operation_name } = await res.json();
      setGameInfo(p => ({ ...p, active_version: version }));
      setBuildOp(operation_name);
      setBuildStatus('IN_PROGRESS');
      toast.info(`Versão ${version} ativada. Deploy em progresso…`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Poll build status
  useEffect(() => {
    if (!buildOp) return;
    const iv = setInterval(async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`/api/builds/${buildOp}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao consultar build');
        const data = await res.json();
        if (data.status !== 'IN_PROGRESS') {
          setBuildStatus(data.build_status);
          clearInterval(iv);
          setBuildOp(null);
          await fetchDeploys();
          await fetchGame();
          toast.success(`Build ${data.build_status}`);
        }
      } catch {
        clearInterval(iv);
        setBuildOp(null);
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [buildOp]);

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={5000} hideProgressBar />
      <ConfirmModal
        isOpen={!!confirmingVersion}
        title="Confirmar ativação"
        message={`Você deseja ativar a versão ${confirmingVersion}?`}
        onConfirm={onConfirmActivate}
        onCancel={() => setConfirmingVersion(null)}
      />

      <button onClick={() => navigate(-1)} style={styles.back}>← Voltar</button>
      <h2 style={styles.title}>
        Deploys de <strong>{gameInfo?.name || gameId}</strong>
      </h2>
      <p>
        Versão ativa: <strong>{gameInfo?.active_version || 'nenhuma'}</strong>
        {buildStatus === 'IN_PROGRESS' && (
          <em style={styles.buildStatus}> 🔄 Em progresso…</em>
        )}
      </p>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Histórico de Deploys</h3>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Versão</th><th>Data</th><th>Quem</th><th>Notas</th><th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map(d => (
                <tr key={d.id}>
                  <td>{d.version}</td>
                  <td>{new Date(d.deployed_at).toLocaleString()}</td>
                  <td>{d.deployed_by_name || d.deployed_by}</td>
                  <td>{d.notes || '–'}</td>
                  <td>
                    {gameInfo?.active_version === d.version ? (
                      <span style={styles.activeLabel}>Ativa</span>
                    ) : (
                      <button onClick={() => confirmActivate(d.version)} style={styles.activateButton}>
                        Ativar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!deploys.length && (
                <tr><td colSpan={5} style={styles.empty}>Nenhum deploy.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Novo Deploy</h3>
        <div
          {...getRootProps()}
          style={{
            ...styles.uploadCard,
            border: isDragActive ? '2px dashed #007bff' : '2px dashed #ccc'
          }}
        >
          <input {...getInputProps()} />
          {file ? (
            <p>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</p>
          ) : (
            <p>Arraste e solte seu .zip aqui, ou clique para selecionar</p>
          )}
        </div>
        {uploadProgress > 0 && (
          <progress value={uploadProgress} max="100" style={styles.progress}>
            {uploadProgress}%
          </progress>
        )}
        <textarea
          placeholder="Notas sobre esta versão"
          disabled={loading}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={styles.textarea}
        />
        <button
          onClick={handleDeploy}
          disabled={loading || !file}
          style={styles.uploadButton}
        >
          {loading ? 'Enviando…' : 'Fazer Deploy'}
        </button>
      </section>
    </div>
  );
}

const styles = {
  container: { padding:24, maxWidth:900, margin:'40px auto', background:'#fafafa', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' },
  back: { background:'transparent', border:'none', cursor:'pointer', fontSize:16, color:'#555', marginBottom:16 },
  title: { margin:'0 0 8px', fontSize:28, color:'#333' },
  buildStatus: { marginLeft:8, fontStyle:'italic', color:'#666' },
  section: { marginBottom:32 },
  sectionTitle: { fontSize:20, marginBottom:12, color:'#444', borderBottom:'2px solid #ddd', paddingBottom:4 },
  tableWrapper: { overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  activateButton: { padding:'4px 12px', background:'#28a745', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' },
  activeLabel: { padding:'4px 12px', background:'#ccc', color:'#333', borderRadius:4, fontSize:'0.9em' },
  empty: { padding:16, textAlign:'center', color:'#999' },
  uploadCard: { display:'flex', flexDirection:'column', gap:12, padding:16, background:'#fff', borderRadius:6, border:'1px solid #ddd', alignItems:'center', textAlign:'center', cursor:'pointer' },
  progress: { width:'100%', marginTop:8 },
  textarea: { width:'100%', minHeight:80, padding:8, borderRadius:4, border:'1px solid #ccc', resize:'vertical', marginTop:12 },
  uploadButton: { marginTop:12, padding:'10px 24px', background:'#007bff', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:16 }
};
