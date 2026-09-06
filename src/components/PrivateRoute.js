import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { LuRefreshCw, LuLogOut } from 'react-icons/lu'
import { useProfile } from '../auth/ProfileContext'
import { Loader, Card, Alert, Button, AuthShell } from './ui'

/**
 * Exige login e, opcionalmente, um dos `roles`. Enquanto o perfil carrega mostra
 * o Loader; se /me falhar mostra o erro com "tentar de novo" em vez de deixar a
 * página renderizar com dados vazios.
 */
export default function PrivateRoute({ roles, children }) {
  const { user, profile, loading, error, refresh, signOut } = useProfile()
  const location = useLocation()

  if (loading) return <Loader label="Verificando sua sessão…" />

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />

  if (error) {
    const unregistered = error.status === 404
    return (
      <AuthShell>
        <Card hero>
          <Alert tone="error" style={{ marginBottom: 18 }}>
            {unregistered
              ? 'Sua conta ainda não está cadastrada na plataforma.'
              : error.message}
          </Alert>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {!unregistered && (
              <Button icon={<LuRefreshCw size={16} />} onClick={refresh}>Tentar de novo</Button>
            )}
            <Button variant="secondary" icon={<LuLogOut size={16} />} onClick={signOut}>
              Sair
            </Button>
          </div>
        </Card>
      </AuthShell>
    )
  }

  if (roles && !roles.includes(profile?.role)) return <Navigate to="/" replace />

  return children
}
