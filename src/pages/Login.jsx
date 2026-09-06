// src/pages/Login.js
import React, { useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { auth, googleProvider } from '../firebase'
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth'
import { FcGoogle } from 'react-icons/fc'
import { LuLock, LuMail, LuLogIn } from 'react-icons/lu'
import { AuthShell, Card, Button, Field, Alert, SegmentedControl } from '../components/ui'
import { fetchProfile } from '../api/profile'
import { logPlatformEvent } from '../api/events'

const UNREGISTERED_MSG = 'Usuário não cadastrado. Faça o registro primeiro.'

export default function Login() {
  const [method, setMethod] = useState('google')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  // Volta para onde a pessoa tentou entrar (ex.: /report?session=… vindo de um jogo).
  const from = location.state?.from
  const destination = from ? `${from.pathname}${from.search || ''}` : '/'

  /**
   * Após autenticar no Firebase, confirma que a conta existe no backend.
   * Sem cadastro (404) desloga e orienta ao registro — mesmo comportamento de
   * antes, agora distinguindo "não cadastrado" de "backend indisponível".
   */
  async function completeSignIn(methodName) {
    try {
      await fetchProfile()
    } catch (err) {
      await signOut(auth)
      const msg = err.status === 404 ? UNREGISTERED_MSG : err.message
      setError(msg)
      await logPlatformEvent('login_failed', { method: methodName, message: msg })
      return
    }
    await logPlatformEvent('login_success', { method: methodName })
    navigate(destination, { replace: true })
  }

  async function handleGoogleSignIn() {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      await completeSignIn('google')
    } catch (err) {
      setError('Erro ao entrar com Google: ' + err.message)
      // Sem usuário autenticado o evento não tem como ser enviado; fica no console.
      await logPlatformEvent('login_failed', { method: 'google', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      await completeSignIn('email')
    } catch (err) {
      setError('Erro ao entrar: ' + err.message)
      await logPlatformEvent('login_failed', { method: 'email', message: err.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthShell>
      <Card hero>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 'var(--a2l-text-xl)' }}>Bem-vindo de volta</h2>
          <p style={{ color: 'var(--a2l-ink-500)', marginTop: 6 }}>
            Entre para continuar sua jornada.
          </p>
        </div>

        <SegmentedControl
          style={{ display: 'flex', width: '100%', marginBottom: 22 }}
          value={method}
          onChange={setMethod}
          items={[
            { id: 'google', label: 'Google', icon: <FcGoogle size={16} /> },
            { id: 'email', label: 'E-mail', icon: <LuMail size={15} /> },
          ]}
        />

        {method === 'google' ? (
          <Button
            variant="secondary"
            size="lg"
            block
            onClick={handleGoogleSignIn}
            loading={loading}
            icon={<FcGoogle size={20} />}
          >
            {loading ? 'Entrando…' : 'Entrar com Google'}
          </Button>
        ) : (
          <form onSubmit={handleEmailSignIn} className="a2l-stack" style={{ gap: 16 }}>
            <Field
              label={
                <>
                  <LuMail size={14} /> E-mail
                </>
              }
              required
            >
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="voce@escola.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </Field>

            <Field
              label={
                <>
                  <LuLock size={14} /> Senha
                </>
              }
              required
            >
              <input
                type="password"
                required
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" size="lg" block loading={loading} icon={<LuLogIn size={18} />}>
              {loading ? 'Entrando…' : 'Entrar'}
            </Button>
          </form>
        )}

        {error && (
          <Alert tone="error" className="a2l-anim-in" style={{ marginTop: 18 }}>
            {error}
          </Alert>
        )}

        <p
          style={{
            marginTop: 22,
            textAlign: 'center',
            fontSize: 'var(--a2l-text-base)',
            color: 'var(--a2l-ink-500)',
          }}
        >
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </Card>
    </AuthShell>
  )
}
