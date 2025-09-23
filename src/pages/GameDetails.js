import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { storage } from '../firebase';
import { getDownloadURL, ref as storageRef, uploadBytes } from 'firebase/storage';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Modal de confirmação para ativar versão
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
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modal: { background: '#fff', padding: 24, borderRadius: 8, maxWidth: 400, width: '90%' },
  buttons: { display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 },
  cancelBtn: { background: '#ccc', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
  confirmBtn: { background: '#28a745', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: 4, cursor: 'pointer' },
};

export default function GameDetails() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();

  // Estado principal
  const [gameInfo, setGameInfo] = useState(null);
  const [iconUrl, setIconUrl] = useState(null);
  const [deploys, setDeploys] = useState([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Modo de edição
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editHasOptions, setEditHasOptions] = useState(false);
  const [editHasWarmup, setEditHasWarmup] = useState(false);
  const [newIconFile, setNewIconFile] = useState(null);

  // Polling
  const [confirmingVersion, setConfirmingVersion] = useState(null);
  const [buildOp, setBuildOp] = useState(null);
  const [buildStatus, setBuildStatus] = useState('');
  const [listPollVersion, setListPollVersion] = useState(null);
  const listPollRef = useRef(null);
  const [gamePollVersion, setGamePollVersion] = useState(null);
  const gamePollRef = useRef(null);

  // Dropzone para .zip
  const { getRootProps, getInputProps, isDragActive, acceptedFiles } = useDropzone({
    accept: { 'application/zip': ['.zip'] },
    multiple: false,
    maxSize: 200 * 1024 * 1024,
    onDropRejected: errs => errs.forEach(e => toast.error(e.errors[0].message))
  });
  const file = acceptedFiles[0] || null;

  // Buscar meta do jogo
  const fetchGame = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch('/api/games', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erro ao carregar jogo');
      const list = await res.json();
      const g = list.find(x => x.id === gameId);
      setGameInfo(g);
      setEditName(g.name);
      setEditHasOptions(g.has_options);
      setEditHasWarmup(g.has_warmup);
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Buscar ícone
  useEffect(() => {
    if (gameInfo?.icon_url) {
      getDownloadURL(storageRef(storage, gameInfo.icon_url))
        .then(url => setIconUrl(url))
        .catch(() => {});
    }
  }, [gameInfo]);

  // Buscar histórico de deploys
  const fetchDeploys = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/games/${gameId}/deploys`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erro ao buscar deploys');
      const data = await res.json();
      setDeploys(data);
      return data;
    } catch (err) {
      toast.error(err.message);
      return [];
    }
  };

  // Inicialização
  useEffect(() => {
    const unsub = auth.onAuthStateChanged(u => {
      if (u) { fetchGame(); fetchDeploys(); }
    });
    return () => unsub();
  }, [gameId]);

  // Poll: novo deploy adicionado
  useEffect(() => {
    if (!listPollVersion) return;
    clearInterval(listPollRef.current);
    listPollRef.current = setInterval(async () => {
      const data = await fetchDeploys();
      if (data.some(d => d.version === listPollVersion)) {
        toast.success(`Deploy ${listPollVersion} adicionado!`);
        clearInterval(listPollRef.current);
        setListPollVersion(null);
        setGamePollVersion(listPollVersion);
      }
    }, 5000);
    return () => clearInterval(listPollRef.current);
  }, [listPollVersion]);

  // Poll: ativação
  useEffect(() => {
    if (!gamePollVersion) return;
    clearInterval(gamePollRef.current);
    gamePollRef.current = setInterval(async () => {
      await fetchGame();
      if (gameInfo?.active_version === gamePollVersion) {
        toast.success(`Versão ${gamePollVersion} ativa!`);
        clearInterval(gamePollRef.current);
        setGamePollVersion(null);
      }
    }, 5000);
    return () => clearInterval(gamePollRef.current);
  }, [gamePollVersion, gameInfo]);

  // Novo deploy
  const handleDeploy = async () => {
    if (!file) return toast.warn('Selecione um .zip válido.');
    setLoading(true); setUploadProgress(0);
    try {
      const token = await auth.currentUser.getIdToken();
      const urlRes = await fetch(
        `/api/games/${gameId}/deploys/upload-url?filename=${encodeURIComponent(file.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!urlRes.ok) throw new Error('Não foi possível obter URL');
      const { upload_url, version } = await urlRes.json();
      await axios.put(upload_url, file, {
        headers: { 'Content-Type': 'application/zip' },
        onUploadProgress: evt => setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      const regRes = await fetch(`/api/games/${gameId}/deploys/register`, {
        method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type':'application/json' },
        body: JSON.stringify({ version, download_url: upload_url, notes })
      });
      if (!regRes.ok) throw new Error('Falha ao registrar deploy');
      toast.info('Deploy registrado!');
      setListPollVersion(version);
      setNotes('');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Ativar manual
  const confirmActivate = v => setConfirmingVersion(v);
  const onConfirmActivate = async () => {
    const version = confirmingVersion;
    setConfirmingVersion(null);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/games/${gameId}/activate/${version}`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Falha ao ativar');
      const { operation_name } = await res.json();
      setGameInfo(p => ({ ...p, active_version: version }));
      setBuildOp(operation_name);
      setBuildStatus('IN_PROGRESS');
      toast.info(`Versão ${version} ativada.`);
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
        const res = await fetch(`/api/builds/${buildOp}/status`, { headers:{ Authorization:`Bearer ${token}` } });
        if (!res.ok) throw new Error('Erro na build');
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

  // Edição de infos
  const handleEditToggle = () => setIsEditing(!isEditing);
  const handleSaveInfo = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      let iconPath = gameInfo.icon_url;

      // Se tiver novo ícone, sobe pelo endpoint de upload
      if (newIconFile) {
        // 1) Pede URL de upload
        const iconUrlRes = await fetch(
          `/api/games/${gameId}/icon/upload-url?filename=${encodeURIComponent(newIconFile.name)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (!iconUrlRes.ok) throw new Error('Erro ao obter URL do ícone');

        const { upload_url: iconUploadUrl, object_path, mime_type } = await iconUrlRes.json();

        // 2) Upload direto para o storage via PUT
        await axios.put(iconUploadUrl, newIconFile, {
          headers: { 'Content-Type': mime_type },
          onUploadProgress: evt =>
            setProgress(Math.round((evt.loaded * 100) / evt.total)),
        });

        iconPath = object_path;
      }

      // Atualiza os outros campos
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          has_options: editHasOptions,
          has_warmup: editHasWarmup,
          icon_url: iconPath,
        }),
      });

      if (!res.ok) throw new Error('Falha ao salvar informações');
      toast.success('Informações atualizadas');
      setIsEditing(false);
      setNewIconFile(null);
      await fetchGame();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (gameInfo === null) {
    return <p style={{ textAlign:'center', padding:20 }}>Carregando…</p>;
  }

  return (
    <div style={styles.container}>
      <ToastContainer position="top-right" autoClose={3000} hideProgressBar />
      <ConfirmModal
        isOpen={!!confirmingVersion}
        title="Confirmar ativação"
        message={`Deseja ativar a versão ${confirmingVersion}?`}
        onConfirm={onConfirmActivate}
        onCancel={() => setConfirmingVersion(null)}
      />

      <button onClick={() => navigate(-1)} style={styles.back}>← Voltar</button>
      <h2 style={styles.title}>Detalhes do Jogo</h2>

      {/* Informações do Jogo */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Informações do Jogo</h3>
        {gameInfo ? (
          <div style={styles.infoCard}>
            {newIconFile ? (
              <img src={URL.createObjectURL(newIconFile)} alt="preview" style={styles.icon} />
            ) : iconUrl ? (
              <img src={iconUrl} alt="ícone" style={styles.icon} />
            ) : (
              <div style={styles.iconPlaceholder}>No Icon</div>
            )}
            <div style={{ flex: 1 }}>
              {!isEditing ? (
                <ul style={styles.infoList}>
                  <li><strong>Nome:</strong> {gameInfo.name}</li>
                  <li><strong>ID:</strong> {gameId}</li>
                  <li><strong>Possui Opções:</strong> {gameInfo.has_options ? 'Sim' : 'Não'}</li>
                  <li><strong>Possui Warmup:</strong> {gameInfo.has_warmup ? 'Sim' : 'Não'}</li>
                  <li><strong>Versão Ativa:</strong> {gameInfo.active_version || 'Nenhuma'}</li>
                </ul>
              ) : (
                <div style={styles.formInline}>
                  <label>
                    Nome:
                    <input style={styles.inputInline} value={editName} onChange={e => setEditName(e.target.value)} />
                  </label>
                  <label>
                    <input type="checkbox" checked={editHasOptions} onChange={e => setEditHasOptions(e.target.checked)} /> Precisa de Opções
                  </label>
                  <label>
                    <input type="checkbox" checked={editHasWarmup} onChange={e => setEditHasWarmup(e.target.checked)} /> Possui Warmup
                  </label>
                  <label style={{ marginTop: 8 }}>
                    Ícone:
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={e => setNewIconFile(e.target.files[0] || null)} 
                      style={{ display: 'block', marginTop: 4 }}
                    />
                  </label>
                </div>
              )}
              <button onClick={isEditing ? handleSaveInfo : handleEditToggle} style={styles.editButton}>
                {isEditing ? 'Salvar' : 'Editar'}
              </button>
              {isEditing && <button onClick={handleEditToggle} style={styles.cancelButton}>Cancelar</button>}
            </div>
          </div>
        ) : <p>Carregando informações...</p>}
      </section>

      {/* Histórico de Deploys */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Histórico de Deploys</h3>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Versão</th>
                <th style={styles.th}>Data</th>
                <th style={styles.th}>Quem</th>
                <th style={styles.th}>Notas</th>
                <th style={styles.th}>Ação</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map(d => (
                <tr key={d.id}>
                  <td style={styles.td}>{d.version}</td>
                  <td style={styles.td}>{new Date(d.deployed_at).toLocaleString()}</td>
                  <td style={styles.td}>{d.deployed_by_name || d.deployed_by}</td>
                  <td style={styles.td}>{d.notes || '–'}</td>
                  <td style={styles.td}>
                    {gameInfo.active_version === d.version ? (
                      <span style={styles.activeLabel}>Ativa</span>
                    ) : (
                      <button onClick={() => confirmActivate(d.version)} style={styles.activateButton}>Ativar</button>
                    )}
                  </td>
                </tr>
              ))}
              {!deploys.length && (
                <tr><td colSpan={5} style={styles.empty}>Nenhum deploy encontrado.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Novo Deploy */}
      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Novo Deploy</h3>
        <div
          {...getRootProps()}
          style={{ ...styles.uploadCard, border: isDragActive ? '2px dashed #1976d2' : '2px dashed #ccc' }}
        >
          <input {...getInputProps()} />
          {file ? <p>{file.name} ({(file.size/1024/1024).toFixed(2)} MB)</p> : <p>Arraste e solte seu .zip aqui, ou clique para selecionar</p>}
        </div>
        {uploadProgress > 0 && <progress value={uploadProgress} max="100" style={styles.progress}>{uploadProgress}%</progress>}
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
        >{loading ? 'Enviando…' : 'Fazer Deploy'}</button>
      </section>
    </div>
  );
}

const styles = {
  container: { padding:24, maxWidth:900, margin:'40px auto', background:'#fafafa', borderRadius:8, boxShadow:'0 4px 12px rgba(0,0,0,0.1)' },
  back: { background:'transparent', border:'none', cursor:'pointer', fontSize:16, color:'#555', marginBottom:16 },
  title: { margin:'0 0 16px', fontSize:28, color:'#333' },
  section: { marginBottom:32 },
  sectionTitle: { fontSize:20, marginBottom:12, color:'#444', borderBottom:'2px solid #ddd', paddingBottom:4 },
  infoCard: { display:'flex', gap:16, alignItems:'center', background:'#fff', padding:16, borderRadius:6, boxShadow:'0 2px 6px rgba(0,0,0,0.05)' },
  icon: { width:64, height:64, borderRadius:8, objectFit:'cover' },
  iconPlaceholder: { width:64, height:64, borderRadius:8, background:'#e0e0e0', display:'flex', alignItems:'center', justifyContent:'center', color:'#999' },
  infoList: { listStyle:'none', padding:0, margin:0, display:'flex', flexDirection:'column', gap:4 },
  formInline: { display:'flex', flexDirection:'column', gap:8 },
  inputInline: { marginLeft:8, padding:4, borderRadius:4, border:'1px solid #ccc' },
  editButton: { marginTop:12, padding:'6px 12px', background:'#1976d2', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' },
  cancelButton: { marginTop:12, marginLeft:8, padding:'6px 12px', background:'#ccc', color:'#333', border:'none', borderRadius:4, cursor:'pointer' },
  tableWrapper: { overflowX:'auto' },
  table: { width:'100%', borderCollapse:'collapse' },
  th: { textAlign:'left', borderBottom:'2px solid #999', padding:10, background:'#e0e0e0', color:'#333' },
  td: { padding:10, borderBottom:'1px solid #ddd' },
  activateButton: { padding:'4px 12px', background:'#28a745', color:'#fff', border:'none', borderRadius:4, cursor:'pointer' },
  activeLabel: { padding:'4px 12px', background:'#ccc', color:'#333', borderRadius:4, fontSize:'0.9em' },
  empty: { padding:16, textAlign:'center', color:'#999' },
  uploadCard: { display:'flex', flexDirection:'column', gap:12, padding:16, background:'#fff', borderRadius:6, border:'1px solid #ddd', alignItems:'center', textAlign:'center', cursor:'pointer' },
  progress: { width:'100%', marginTop:8 },
  textarea: { width:'100%', minHeight:80, padding:8, borderRadius:4, border:'1px solid #ccc', resize:'vertical', marginTop:12 },
  uploadButton: { marginTop:12, padding:'10px 24px', background:'#007bff', color:'#fff', border:'none', borderRadius:4, cursor:'pointer', fontSize:16 }
};