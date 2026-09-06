// src/pages/Dashboard.js
import React from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LuGamepad2,
  LuPencilRuler,
  LuSettings,
  LuLogOut,
  LuArrowRight,
  LuSparkles,
} from 'react-icons/lu'
import { AppShell, UserChip, Card, Button, PageHead, Badge } from '../components/ui'
import { useProfile } from '../auth/ProfileContext'

const ROLE_LABEL = { student: 'Aluno(a)', teacher: 'Professor(a)', admin: 'Administrador(a)' }

export default function Dashboard() {
  // Perfil e sessão vêm do ProfileProvider; o PrivateRoute já garantiu ambos.
  const { profile, displayName, isTeacher, signOut } = useProfile()
  const navigate = useNavigate()

  const firstName = (displayName || 'Amigo').split(' ')[0]

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <AppShell
      width="lg"
      actions={
        <>
          <UserChip name={displayName} role={ROLE_LABEL[profile?.role]} />
          <Button variant="ghost" size="sm" onClick={handleLogout} aria-label="Sair" title="Sair">
            <LuLogOut size={17} />
          </Button>
        </>
      }
    >
      <PageHead
        className="a2l-anim-in"
        eyebrow={
          <>
            <LuSparkles size={13} /> Seu painel
          </>
        }
        hero
        title={`Olá, ${firstName}!`}
        subtitle="Escolha por onde continuar hoje."
      />

      {/* Ação principal: jogar. Ocupa a largura toda e domina a hierarquia. */}
      <Card
        hero
        interactive
        className="a2l-anim-in a2l-delay-1"
        onClick={() => navigate('/select')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 20,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <span className="a2l-icon-chip a2l-icon-chip--lg a2l-icon-chip--solid">
          <LuGamepad2 size={26} />
        </span>
        <div style={{ flex: '1 1 220px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <h2 style={{ fontSize: 'var(--a2l-text-xl)' }}>Jogar agora</h2>
            <Badge tone="mint">Adaptativo</Badge>
          </div>
          <p style={{ color: 'var(--a2l-ink-500)', marginTop: 6 }}>
            Atividades que se ajustam ao seu ritmo, jogo a jogo.
          </p>
        </div>
        <Button variant="primary" size="lg" iconRight={<LuArrowRight size={18} />} tabIndex={-1}>
          Começar
        </Button>
      </Card>

      {isTeacher && (
        <div className="a2l-grid a2l-grid--2 a2l-anim-in a2l-delay-2">
          <Card interactive onClick={() => navigate('/creation')}>
            <span className="a2l-icon-chip a2l-icon-chip--mint">
              <LuPencilRuler size={20} />
            </span>
            <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginTop: 14 }}>Área de criação</h3>
            <p
              style={{
                color: 'var(--a2l-ink-500)',
                marginTop: 6,
                fontSize: 'var(--a2l-text-base)',
              }}
            >
              Envie documentos e monte desafios de palavras para suas turmas.
            </p>
          </Card>

          <Card interactive onClick={() => navigate('/admin')}>
            <span className="a2l-icon-chip a2l-icon-chip--sun">
              <LuSettings size={20} />
            </span>
            <h3 style={{ fontSize: 'var(--a2l-text-lg)', marginTop: 14 }}>Administração</h3>
            <p
              style={{
                color: 'var(--a2l-ink-500)',
                marginTop: 6,
                fontSize: 'var(--a2l-text-base)',
              }}
            >
              Métricas de uso, alunos, sessões e configuração dos jogos.
            </p>
          </Card>
        </div>
      )}
    </AppShell>
  )
}
