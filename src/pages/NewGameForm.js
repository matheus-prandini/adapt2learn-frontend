import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { apiJson, jsonBody } from '../api/httpClient';
import { useDropzone } from 'react-dropzone';
import { toast } from 'react-toastify';
import { LuUpload, LuImage, LuFileArchive, LuGamepad2, LuPlus } from 'react-icons/lu';
import { AppShell, Card, Button, Field, PageHead, Switch } from '../components/ui';

export default function NewGameForm() {
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
    onDropRejected: rejections => {
      console.log("Ícone rejeitado:", rejections);
      rejections.forEach(r => toast.error(`Erro: ${r.errors[0].message}`));
    }
  });

  // Dropzone: zip do jogo
  const {
    getRootProps: getGameRootProps,
    getInputProps: getGameInputProps,
    isDragActive: isGameDragActive
  } = useDropzone({
    multiple: false,
    maxSize: 100 * 1024 * 1024, // 100 MB
    onDrop: accepted => {
      console.log("Arquivo aceito:", accepted[0]);
      setGameFile(accepted[0]);
    },
    onDropRejected: rejections => {
      console.log("Rejeitado:", rejections);
      rejections.forEach(r =>
        toast.error(`Erro: ${r.errors[0].message}`)
      );
    },
    // Aceita qualquer arquivo .zip, independentemente do MIME
    validator: file => {
      if (!file.name.toLowerCase().endsWith('.zip')) {
        return { code: 'file-invalid-type', message: 'Apenas arquivos .zip são permitidos' };
      }
      return null;
    }
  });

  const handleSubmit = async e => {
    e.preventDefault();
    if (!name || !iconFile || !gameFile) {
      toast.error('Por favor preencha todos os campos e selecione os arquivos.');
      return;
    }
    setLoading(true);
    setProgress(0);

    try {
      // 1) Criar o jogo
      const { id: gameId } = await apiJson('/games', {
        method: 'POST',
        ...jsonBody({ name, has_options: hasOptions, has_warmup: hasWarmup }),
      }, 'Erro ao criar jogo');

      // 2) Upload do ícone
      const { upload_url: iconUploadUrl, object_path, mime_type } = await apiJson(
        `/games/${gameId}/icon/upload-url?filename=${encodeURIComponent(iconFile.name)}`,
        undefined, 'Erro ao obter URL do ícone'
      );
      await axios.put(iconUploadUrl, iconFile, {
        headers: { 'Content-Type': mime_type },
        onUploadProgress: evt => setProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      await apiJson(`/games/${gameId}`, {
        method: 'PATCH', ...jsonBody({ icon_url: object_path }),
      }, 'Erro ao atualizar ícone');

      // 3) Deploy do ZIP
      const { upload_url: zipUploadUrl, version } = await apiJson(
        `/games/${gameId}/deploys/upload-url?filename=${encodeURIComponent(gameFile.name)}`,
        undefined, 'Erro ao obter URL de deploy'
      );
      await axios.put(zipUploadUrl, gameFile, {
        headers: { 'Content-Type': gameFile.type },
        onUploadProgress: evt => setProgress(Math.round((evt.loaded * 100) / evt.total))
      });
      await apiJson(`/games/${gameId}/deploys/register`, {
        method: 'POST', ...jsonBody({ version, download_url: zipUploadUrl, notes: '' }),
      }, 'Erro ao registrar deploy');

      toast.success('Jogo criado com sucesso!');
      navigate('/admin');
    } catch (err) {
      console.log("[HandleSubmit] catch", err);
      toast.error(err.message);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  return (
    <AppShell width="md" back={-1}>
      <PageHead
        className="a2l-anim-in"
        eyebrow={<><LuGamepad2 size={13} /> Administração</>}
        title="Novo jogo"
        subtitle="Cadastre o jogo, envie o ícone e o pacote .zip da build."
      />

      <Card hero as="form" onSubmit={handleSubmit} className="a2l-anim-in a2l-delay-1">
        <div className="a2l-stack" style={{ gap: 18 }}>
          <Field label="Nome do jogo" required>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Ex: Desafio de Geometria"
            />
          </Field>

          <div className="a2l-field">
            <span className="a2l-label"><LuImage size={14} /> Ícone (.png, .jpg)</span>
            <div
              {...getIconRootProps()}
              className="a2l-dropzone"
              data-active={isIconDragActive || undefined}
              data-filled={iconFile ? true : undefined}
            >
              <input {...getIconInputProps()} />
              <LuUpload size={20} />
              <span>
                {isIconDragActive
                  ? 'Solte o ícone aqui…'
                  : iconFile
                  ? iconFile.name
                  : 'Clique ou arraste o ícone (.png/.jpg)'}
              </span>
            </div>
          </div>

          <div className="a2l-field">
            <span className="a2l-label"><LuFileArchive size={14} /> Arquivo do jogo (.zip)</span>
            <div
              {...getGameRootProps()}
              className="a2l-dropzone"
              data-active={isGameDragActive || undefined}
              data-filled={gameFile ? true : undefined}
            >
              <input {...getGameInputProps()} />
              <LuUpload size={20} />
              <span>
                {isGameDragActive
                  ? 'Solte o .zip aqui…'
                  : gameFile
                  ? gameFile.name
                  : 'Clique ou arraste o .zip'}
              </span>
            </div>
          </div>

          <div className="a2l-stack" style={{ gap: 14, padding: '4px 0' }}>
            <Switch
              checked={hasWarmup}
              onChange={e => setHasWarmup(e.target.checked)}
              label="Possui aquecimento"
              hint="Exibe uma atividade de preparação antes de jogar."
            />
            <Switch
              checked={hasOptions}
              onChange={e => setHasOptions(e.target.checked)}
              label="Precisa de opções"
              hint="O aluno escolhe disciplina e subárea antes de começar."
            />
          </div>

          {progress > 0 && (
            <div>
              <div className="a2l-progress">
                <div className="a2l-progress__bar" style={{ width: `${progress}%` }} />
              </div>
              <span className="a2l-hint" style={{ marginTop: 6, display: 'block' }}>
                Enviando… {progress}%
              </span>
            </div>
          )}

          <Button type="submit" size="lg" loading={loading} icon={<LuPlus size={18} />}>
            {loading ? 'Criando…' : 'Criar jogo'}
          </Button>
        </div>
      </Card>

    </AppShell>
  );
}
