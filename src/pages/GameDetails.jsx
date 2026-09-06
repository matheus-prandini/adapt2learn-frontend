import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { storage } from '../firebase';
import { apiJson, jsonBody } from '../api/httpClient';
import { getDownloadURL, ref as storageRef } from 'firebase/storage';
import axios from 'axios';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { LuPackage, LuUpload, LuPencil, LuCheck, LuX, LuImage } from 'react-icons/lu';
import { AppShell, Card, Button, Badge, Loader, PageHead, ConfirmDialog } from '../components/ui';

// Modal de confirmação para ativar versão
export default function GameDetails() {
  const { id: gameId } = useParams();

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
  const fetchGame = useCallback(async () => {
    try {
      const list = await apiJson('/games', undefined, 'Erro ao carregar jogo');
      const g = list.find(x => x.id === gameId);
      if (!g) throw new Error('Jogo não encontrado.');
      setGameInfo(g);
      setEditName(g.name);
      setEditHasOptions(g.has_options);
      setEditHasWarmup(g.has_warmup);
    } catch (err) {
      toast.error(err.message);
    }
  }, [gameId]);

  // Buscar ícone
  useEffect(() => {
    if (gameInfo?.icon_url) {
      getDownloadURL(storageRef(storage, gameInfo.icon_url))
        .then(url => setIconUrl(url))
        .catch(() => {});
    }
  }, [gameInfo]);

  // Buscar histórico de deploys
  const fetchDeploys = useCallback(async () => {
    try {
      const data = await apiJson(`/games/${gameId}/deploys`, undefined, 'Erro ao buscar deploys');
      setDeploys(data);
      return data;
    } catch (err) {
      toast.error(err.message);
      return [];
    }
  }, [gameId]);

  // Inicialização — o PrivateRoute já garantiu usuário autenticado.
  useEffect(() => {
    fetchGame();
    fetchDeploys();
  }, [fetchGame, fetchDeploys]);

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
  }, [listPollVersion, fetchDeploys]);

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
  }, [gamePollVersion, gameInfo, fetchGame]);

  // Novo deploy
  const handleDeploy = async () => {
    if (!file) return toast.warn('Selecione um .zip válido.');
    setLoading(true); setUploadProgress(0);
    try {
      const { upload_url, version } = await apiJson(
        `/games/${gameId}/deploys/upload-url?filename=${encodeURIComponent(file.name)}`,
        undefined, 'Não foi possível obter URL de upload'
      );
      await axios.put(upload_url, file, {
        headers: { 'Content-Type': 'application/zip' },
        onUploadProgress: evt => setUploadProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      await apiJson(`/games/${gameId}/deploys/register`, {
        method: 'POST', ...jsonBody({ version, download_url: upload_url, notes }),
      }, 'Falha ao registrar deploy');
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
      const { operation_name } = await apiJson(`/games/${gameId}/activate/${version}`, { method: 'POST' }, 'Falha ao ativar');
      setGameInfo(p => ({ ...p, active_version: version }));
      setBuildOp(operation_name);
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
        const data = await apiJson(`/builds/${buildOp}/status`, undefined, 'Erro na build');
        if (data.status !== 'IN_PROGRESS') {
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
  }, [buildOp, fetchDeploys, fetchGame]);

  // Edição de infos
  const handleEditToggle = () => setIsEditing(!isEditing);
  const handleSaveInfo = async () => {
    try {
      let iconPath = gameInfo.icon_url;

      // Se tiver novo ícone, sobe pelo endpoint de upload
      if (newIconFile) {
        // 1) Pede URL de upload
        const { upload_url: iconUploadUrl, object_path, mime_type } = await apiJson(
          `/games/${gameId}/icon/upload-url?filename=${encodeURIComponent(newIconFile.name)}`,
          undefined, 'Erro ao obter URL do ícone'
        );

        // 2) Upload direto para o storage via PUT
        await axios.put(iconUploadUrl, newIconFile, {
          headers: { 'Content-Type': mime_type },
          onUploadProgress: evt =>
            setUploadProgress(Math.round((evt.loaded * 100) / evt.total)),
        });

        iconPath = object_path;
      }

      // Atualiza os outros campos
      await apiJson(`/games/${gameId}`, {
        method: 'PATCH',
        ...jsonBody({
          name: editName,
          has_options: editHasOptions,
          has_warmup: editHasWarmup,
          icon_url: iconPath,
        }),
      }, 'Falha ao salvar informações');
      toast.success('Informações atualizadas');
      setIsEditing(false);
      setNewIconFile(null);
      await fetchGame();
    } catch (e) {
      toast.error(e.message);
    }
  };

  if (gameInfo === null) {
    return <Loader />;
  }

  return (
    <AppShell width="lg" back={-1}>
      <ConfirmDialog
        open={!!confirmingVersion}
        title="Ativar versão"
        message={`A versão ${confirmingVersion} passará a ser servida aos alunos. Deseja continuar?`}
        confirmLabel="Ativar"
        onConfirm={onConfirmActivate}
        onCancel={() => setConfirmingVersion(null)}
      />

      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuPackage size={13} /> Administração</>}
        title="Detalhes do jogo"
        subtitle="Informações, histórico de versões e publicação de novos builds."
      />

      {/* Informações do Jogo */}
      <Card hero className="a2l-anim-in a2l-delay-1" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 18 }}>Informações do jogo</h3>
        {gameInfo ? (
          <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {newIconFile ? (
              <img src={URL.createObjectURL(newIconFile)} alt="Pré-visualização do ícone" style={styles.icon} />
            ) : iconUrl ? (
              <img src={iconUrl} alt="Ícone do jogo" style={styles.icon} />
            ) : (
              <div style={styles.iconPlaceholder}><LuImage size={24} /></div>
            )}

            <div style={{ flex: '1 1 260px', minWidth: 0 }}>
              {!isEditing ? (
                <dl style={styles.infoList}>
                  <div style={styles.infoRow}>
                    <dt style={styles.infoKey}>Nome</dt>
                    <dd style={styles.infoVal}>{gameInfo.name}</dd>
                  </div>
                  <div style={styles.infoRow}>
                    <dt style={styles.infoKey}>ID</dt>
                    <dd style={{ ...styles.infoVal, fontFamily: 'var(--a2l-font-mono)', fontSize: 'var(--a2l-text-sm)' }}>{gameId}</dd>
                  </div>
                  <div style={styles.infoRow}>
                    <dt style={styles.infoKey}>Opções</dt>
                    <dd style={styles.infoVal}>
                      <Badge tone={gameInfo.has_options ? 'success' : 'neutral'}>
                        {gameInfo.has_options ? 'Sim' : 'Não'}
                      </Badge>
                    </dd>
                  </div>
                  <div style={styles.infoRow}>
                    <dt style={styles.infoKey}>Aquecimento</dt>
                    <dd style={styles.infoVal}>
                      <Badge tone={gameInfo.has_warmup ? 'success' : 'neutral'}>
                        {gameInfo.has_warmup ? 'Sim' : 'Não'}
                      </Badge>
                    </dd>
                  </div>
                  <div style={styles.infoRow}>
                    <dt style={styles.infoKey}>Versão ativa</dt>
                    <dd style={styles.infoVal}>
                      <Badge tone={gameInfo.active_version ? 'brand' : 'neutral'}>
                        {gameInfo.active_version || 'Nenhuma'}
                      </Badge>
                    </dd>
                  </div>
                </dl>
              ) : (
                <div className="a2l-stack" style={{ gap: 14 }}>
                  <div className="a2l-field">
                    <span className="a2l-label">Nome</span>
                    <input className="a2l-input" value={editName} onChange={e => setEditName(e.target.value)} />
                  </div>
                  <label className="a2l-option" style={{ maxWidth: 320 }}>
                    <input className="a2l-check" type="checkbox" checked={editHasOptions} onChange={e => setEditHasOptions(e.target.checked)} />
                    Precisa de opções
                  </label>
                  <label className="a2l-option" style={{ maxWidth: 320 }}>
                    <input className="a2l-check" type="checkbox" checked={editHasWarmup} onChange={e => setEditHasWarmup(e.target.checked)} />
                    Possui aquecimento
                  </label>
                  <div className="a2l-field">
                    <span className="a2l-label">Ícone</span>
                    <input
                      className="a2l-file"
                      type="file"
                      accept="image/*"
                      onChange={e => setNewIconFile(e.target.files[0] || null)}
                    />
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10, marginTop: 18, flexWrap: 'wrap' }}>
                <Button
                  onClick={isEditing ? handleSaveInfo : handleEditToggle}
                  icon={isEditing ? <LuCheck size={16} /> : <LuPencil size={15} />}
                >
                  {isEditing ? 'Salvar' : 'Editar'}
                </Button>
                {isEditing && (
                  <Button variant="secondary" icon={<LuX size={16} />} onClick={handleEditToggle}>
                    Cancelar
                  </Button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <Loader label="Carregando informações…" />
        )}
      </Card>

      {/* Histórico de Deploys */}
      <Card className="a2l-anim-in a2l-delay-2" style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 16 }}>Histórico de deploys</h3>
        <div className="a2l-table-wrap">
          <table className="a2l-table">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Data</th>
                <th>Quem</th>
                <th>Notas</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {deploys.map(d => (
                <tr key={d.id}>
                  <td style={{ fontFamily: 'var(--a2l-font-mono)', fontSize: 'var(--a2l-text-sm)' }}>{d.version}</td>
                  <td>{new Date(d.deployed_at).toLocaleString('pt-BR')}</td>
                  <td>{d.deployed_by_name || d.deployed_by}</td>
                  <td>{d.notes || '–'}</td>
                  <td>
                    {gameInfo.active_version === d.version ? (
                      <Badge tone="success" icon={<LuCheck size={12} />}>Ativa</Badge>
                    ) : (
                      <Button variant="soft" size="sm" onClick={() => confirmActivate(d.version)}>
                        Ativar
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {!deploys.length && (
                <tr>
                  <td colSpan={5} style={{ padding: 28, textAlign: 'center', color: 'var(--a2l-ink-400)' }}>
                    Nenhum deploy encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Novo Deploy */}
      <Card className="a2l-anim-in a2l-delay-3">
        <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginBottom: 16 }}>Novo deploy</h3>

        <div
          {...getRootProps()}
          className="a2l-dropzone"
          data-active={isDragActive || undefined}
          data-filled={file ? true : undefined}
        >
          <input {...getInputProps()} />
          <LuUpload size={20} />
          <span>
            {file
              ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`
              : 'Arraste e solte seu .zip aqui, ou clique para selecionar'}
          </span>
        </div>

        {uploadProgress > 0 && (
          <div style={{ marginTop: 14 }}>
            <div className="a2l-progress">
              <div className="a2l-progress__bar" style={{ width: `${uploadProgress}%` }} />
            </div>
            <span className="a2l-hint" style={{ marginTop: 6, display: 'block' }}>
              Enviando… {uploadProgress}%
            </span>
          </div>
        )}

        <textarea
          className="a2l-input"
          placeholder="Notas sobre esta versão"
          disabled={loading}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          style={{ marginTop: 16 }}
        />

        <Button
          onClick={handleDeploy}
          loading={loading}
          disabled={loading || !file}
          icon={<LuUpload size={17} />}
          style={{ marginTop: 16 }}
        >
          {loading ? 'Enviando…' : 'Fazer deploy'}
        </Button>
      </Card>
    </AppShell>
  );
}

const styles = {
  icon: {
    width: 76, height: 76, borderRadius: 'var(--a2l-radius-md)',
    objectFit: 'cover', border: '1px solid var(--a2l-line)', flex: 'none',
  },
  iconPlaceholder: {
    width: 76, height: 76, borderRadius: 'var(--a2l-radius-md)',
    background: 'var(--a2l-surface-2)', border: '1px solid var(--a2l-line)',
    display: 'grid', placeItems: 'center', color: 'var(--a2l-ink-400)', flex: 'none',
  },
  infoList: { margin: 0, display: 'flex', flexDirection: 'column', gap: 10 },
  infoRow: { display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' },
  infoKey: {
    minWidth: 120, fontFamily: 'var(--a2l-font-display)', fontWeight: 700,
    fontSize: 'var(--a2l-text-xs)', textTransform: 'uppercase',
    letterSpacing: '0.05em', color: 'var(--a2l-ink-500)',
  },
  infoVal: { margin: 0, color: 'var(--a2l-ink-900)', fontWeight: 600 },
};
