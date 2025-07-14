import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';

export default function GameDetails() {
  const { id: gameId } = useParams();
  const navigate = useNavigate();

  const [gameInfo, setGameInfo] = useState(null);
  const [deploys, setDeploys] = useState([]);
  const [file, setFile] = useState(null);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [activating, setActivating] = useState(null);
  const [buildOp, setBuildOp] = useState(null);
  const [buildStatus, setBuildStatus] = useState('');

  // 1) Carrega meta do jogo
  useEffect(() => {
    (async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch('/api/games', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao carregar jogos');
        const list = await res.json();
        setGameInfo(list.find(g => g.id === gameId));
      } catch (err) {
        console.error(err);
      }
    })();
  }, [gameId]);

  // 2) Busca histórico de deploys
  const fetchDeploys = async () => {
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(`/api/games/${gameId}/deploys`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Erro ao buscar deploys');
      setDeploys(await res.json());
    } catch (err) {
      console.error(err);
    }
  };
  useEffect(fetchDeploys, [gameId]);

  // 3) Upload de novo deploy
  const handleDeploy = async () => {
    if (!file || !file.name.toLowerCase().endsWith('.zip')) {
      return alert('Selecione um arquivo .zip válido.');
    }
    setLoading(true);
    try {
      const token = await auth.currentUser.getIdToken();
      // upload-url
      const urlRes = await fetch(
        `/api/games/${gameId}/deploys/upload-url?filename=${encodeURIComponent(file.name)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!urlRes.ok) throw new Error('Não foi possível obter URL de upload');
      const { upload_url, version } = await urlRes.json();
      // PUT no bucket
      const putRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/zip' },
        body: file
      });
      if (!putRes.ok) throw new Error('Erro ao enviar ZIP para o bucket');
      // registra o deploy
      const regRes = await fetch(`/api/games/${gameId}/deploys/register`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ version, download_url: upload_url, notes })
      });
      if (!regRes.ok) throw new Error('Falha ao registrar deploy');
      await fetchDeploys();
      setFile(null);
      setNotes('');
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 4) Ativar versão + disparar Cloud Build
  const handleActivate = async version => {
    if (!window.confirm(`Definir a versão ${version} como ativa?`)) return;
    setActivating(version);
    try {
      const token = await auth.currentUser.getIdToken();
      const res = await fetch(
        `/api/games/${gameId}/activate/${version}`,
        { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) throw new Error('Falha ao ativar versão');
      const { operation_name } = await res.json();
      setGameInfo(prev => ({ ...prev, active_version: version }));
      setBuildOp(operation_name);
      setBuildStatus('IN_PROGRESS');
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setActivating(null);
    }
  };

  // 5) Polling do status do build
  useEffect(() => {
    if (!buildOp) return;
    const interval = setInterval(async () => {
      try {
        const token = await auth.currentUser.getIdToken();
        const res = await fetch(`/api/builds/${buildOp}/status`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Erro ao consultar build');
        const data = await res.json();
        if (data.status === 'IN_PROGRESS') {
          setBuildStatus('IN_PROGRESS');
        } else {
          setBuildStatus(data.build_status);
          clearInterval(interval);
          setBuildOp(null);
          // refresh data
          fetchDeploys();
          const newToken = await auth.currentUser.getIdToken();
          const infoRes = await fetch('/api/games', { headers: { Authorization: `Bearer ${newToken}` } });
          const list = await infoRes.json();
          setGameInfo(list.find(g => g.id === gameId));
        }
      } catch {
        clearInterval(interval);
        setBuildOp(null);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [buildOp, gameId]);

  return (
    <div style={styles.container}>
      <button onClick={() => navigate(-1)} style={styles.back}>← Voltar</button>
      <h2 style={styles.title}>
        Deploys de <strong>{gameInfo?.name || gameId}</strong>{' '}
        <small style={styles.small}>(ID: {gameId})</small>
      </h2>
      <p>
        Versão ativa: <strong>{gameInfo?.active_version || 'nenhuma'}</strong>
        {buildStatus === 'IN_PROGRESS' && (
          <span style={styles.buildStatus}> 🔄 Deploy em progresso…</span>
        )}
      </p>

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
                <tr key={d.id} style={styles.tr}>
                  <td style={styles.td}>{d.version}</td>
                  <td style={styles.td}>{new Date(d.deployed_at).toLocaleString()}</td>
                  <td style={styles.td}>{d.deployed_by_name || d.deployed_by}</td>
                  <td style={styles.td}>{d.notes || '–'}</td>
                  <td style={styles.td}>
                    {gameInfo?.active_version === d.version ? (
                      <span style={styles.activeLabel}>Ativa</span>
                    ) : (
                      <button
                        onClick={() => handleActivate(d.version)}
                        disabled={activating === d.version}
                        style={styles.activateButton}
                      >
                        {activating === d.version ? '…' : 'Ativar'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {!deploys.length && (
                <tr>
                  <td colSpan={5} style={styles.empty}>Nenhum deploy encontrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Novo Deploy</h3>
        <div style={styles.uploadCard}>
          <input
            type="file"
            accept=".zip"
            disabled={loading}
            onChange={e => setFile(e.target.files[0])}
            style={styles.fileInput}
          />
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
        </div>
      </section>
    </div>
  );
}

const styles = {
  container: { padding: 24, maxWidth: 900, margin: '40px auto', background: '#fafafa', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
  back: { background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 16, color: '#555', marginBottom: 16 },
  title: { margin: '0 0 8px', fontSize: 28, color: '#333' },
  small: { fontSize: '0.6em', color: '#888' },
  buildStatus: { marginLeft: 8, fontStyle: 'italic', color: '#666' },
  section: { marginBottom: 32 },
  sectionTitle: { fontSize: 20, marginBottom: 12, color: '#444', borderBottom: '2px solid #ddd', paddingBottom: 4 },
  tableWrapper: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 8px', background: '#e0e0e0', fontWeight: 'bold' },
  tr: { borderBottom: '1px solid #ddd' },
  td: { padding: '12px 8px', color: '#555' },
  activateButton: { padding: '4px 12px', background: '#28a745', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer' },
  activeLabel: { padding: '4px 12px', background: '#ccc', color: '#333', borderRadius: 4, fontSize: '0.9em' },
  empty: { padding: '16px', textAlign: 'center', color: '#999' },
  uploadCard: { display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: '#fff', borderRadius: 6, border: '1px solid #ddd' },
  fileInput: { padding: 6 },
  textarea: { minHeight: 80, padding: 8, borderRadius: 4, border: '1px solid #ccc', resize: 'vertical' },
  uploadButton: { alignSelf: 'flex-start', padding: '10px 24px', background: '#007bff', color: '#fff', border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 16 }
};
