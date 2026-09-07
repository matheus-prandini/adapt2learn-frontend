import React from 'react'
import { LuTriangleAlert, LuArrowLeft, LuRefreshCw } from 'react-icons/lu'
import { Card, Button } from './ui'

/**
 * Última linha de defesa: sem isto, qualquer exceção de render derruba a
 * árvore inteira e o aluno vê uma tela branca sem saída. Aqui ele vê o que
 * aconteceu e tem dois botões. Em desenvolvimento, o stack aparece embaixo.
 */
export default class ErrorBoundary extends React.Component {
  state = { error: null }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    this.props.onError?.(error, info)
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24 }}>
        <Card hero style={{ maxWidth: 480, width: '100%', textAlign: 'center' }}>
          <span
            className="a2l-icon-chip a2l-icon-chip--lg a2l-icon-chip--danger"
            style={{ margin: '0 auto 16px' }}
          >
            <LuTriangleAlert size={26} />
          </span>
          <h2 style={{ fontSize: 'var(--a2l-text-xl)' }}>Algo deu errado</h2>
          <p style={{ color: 'var(--a2l-ink-500)', marginTop: 8, marginBottom: 22 }}>
            A tela encontrou um problema inesperado. Voltar ao início costuma resolver.
          </p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button icon={<LuArrowLeft size={16} />} onClick={() => window.location.assign('/')}>
              Voltar ao início
            </Button>
            <Button
              variant="secondary"
              icon={<LuRefreshCw size={16} />}
              onClick={() => window.location.reload()}
            >
              Recarregar
            </Button>
          </div>
          {import.meta.env.DEV && (
            <pre className="a2l-pre" style={{ textAlign: 'left', marginTop: 20, maxHeight: 240 }}>
              {String(this.state.error?.stack || this.state.error)}
            </pre>
          )}
        </Card>
      </div>
    )
  }
}
