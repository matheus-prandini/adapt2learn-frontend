import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { LuPlus, LuEye, LuTrash2, LuInbox } from 'react-icons/lu'
import { apiJson } from '../../api/httpClient'
import { Button, Badge, Card, EmptyState, Loader, ConfirmDialog } from '../../components/ui'
import SectionTitle from './SectionTitle'

const iconStyle = {
  width: 34,
  height: 34,
  borderRadius: 10,
  objectFit: 'cover',
  border: '1px solid var(--a2l-line)',
  display: 'block',
}

export default function GamesTab({ games, loading, onRemoved }) {
  const navigate = useNavigate()

  const [pending, setPending] = useState(null) // jogo aguardando confirmação de exclusão
  const [deleting, setDeleting] = useState(false)

  const confirmDelete = async () => {
    if (!pending) return
    setDeleting(true)
    try {
      await apiJson(`/games/${pending.id}`, { method: 'DELETE' }, 'Falha ao excluir o jogo.')
      onRemoved(pending.id)
      toast.success(`Jogo "${pending.name}" excluído`)
      setPending(null)
    } catch (err) {
      toast.error(err.message)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <SectionTitle
        action={
          <Button icon={<LuPlus size={17} />} onClick={() => navigate('/admin/games/new')}>
            Novo jogo
          </Button>
        }
      >
        Jogos
      </SectionTitle>

      {loading ? (
        <Loader label="Carregando jogos…" />
      ) : games.length === 0 ? (
        <Card quiet>
          <EmptyState icon={<LuInbox size={22} />} title="Nenhum jogo cadastrado" />
        </Card>
      ) : (
        <div className="a2l-table-wrap">
          <table className="a2l-table">
            <thead>
              <tr>
                <th>Ícone</th>
                <th>ID</th>
                <th>Nome</th>
                <th>Aquecimento</th>
                <th>Opções</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {games.map(g => (
                <tr key={g.id}>
                  <td>{g.iconUrl && <img src={g.iconUrl} alt="" style={iconStyle} />}</td>
                  <td
                    style={{ fontFamily: 'var(--a2l-font-mono)', fontSize: 'var(--a2l-text-sm)' }}
                  >
                    {g.id}
                  </td>
                  <td style={{ fontWeight: 600 }}>{g.name}</td>
                  <td>
                    <Badge tone={g.has_warmup ? 'success' : 'neutral'}>
                      {g.has_warmup ? 'Sim' : 'Não'}
                    </Badge>
                  </td>
                  <td>
                    <Badge tone={g.has_options ? 'success' : 'neutral'}>
                      {g.has_options ? 'Sim' : 'Não'}
                    </Badge>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => navigate(`/admin/games/${g.id}`)}
                        title="Ver detalhes"
                        aria-label="Ver detalhes"
                      >
                        <LuEye size={15} />
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setPending(g)}
                        title="Excluir jogo"
                        aria-label="Excluir jogo"
                        style={{ color: 'var(--a2l-danger)' }}
                      >
                        <LuTrash2 size={15} />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ConfirmDialog
        open={!!pending}
        tone="danger"
        title="Excluir jogo"
        message={
          pending
            ? `"${pending.name}" será removido da plataforma. Esta ação não pode ser desfeita.`
            : ''
        }
        confirmLabel="Excluir"
        busy={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setPending(null)}
      />
    </>
  )
}
