// src/pages/Register.js
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { auth, googleProvider } from '../firebase'
import { signInWithPopup, createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { FcGoogle } from 'react-icons/fc'
import {
  LuUser,
  LuMail,
  LuLock,
  LuCake,
  LuGraduationCap,
  LuSchool,
  LuUserPlus,
} from 'react-icons/lu'
import { AuthShell, Card, Button, Field, Alert, SegmentedControl } from '../components/ui'
import { apiJson, jsonBody } from '../api/httpClient'
import { logPlatformEvent } from '../api/events'
import { useProfile } from '../auth/ProfileContext'
import { SCHOOLS, GRADE_OPTIONS } from '../constants/schools'

const ROLE_OPTIONS = [
  { label: 'Aluno', value: 'student' },
  { label: 'Professor', value: 'teacher' },
]

export default function Register() {
  const [method, setMethod] = useState('google')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [birthDate, setBirthDate] = useState('')
  const [role, setRole] = useState('')
  const [grade, setGrade] = useState('')
  const [school, setSchool] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()
  // O provider já buscou /me antes do cadastro existir (404); o refresh limpa isso.
  const { refresh } = useProfile()

  // Campos comuns aos dois métodos. grade_level só vai para aluno.
  const buildSchoolPayload = () => ({
    birth_date: birthDate,
    role,
    school_id: school,
    ...(role === 'student' ? { grade_level: grade } : {}),
  })

  async function handleGoogleRegister() {
    setError('')
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      try {
        await apiJson(
          '/signup-google',
          { method: 'POST', ...jsonBody(buildSchoolPayload()) },
          'Não foi possível concluir o cadastro.'
        )
      } catch (err) {
        await signOut(auth)
        throw err
      }
      logPlatformEvent('user_signup', { method: 'google' })
      refresh()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailRegister(e) {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }
    setError('')
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      try {
        await apiJson(
          '/signup',
          {
            method: 'POST',
            ...jsonBody({ name, mail: email, password, ...buildSchoolPayload() }),
          },
          'Não foi possível concluir o cadastro.'
        )
      } catch (err) {
        // Sem cadastro no backend a conta Firebase ficaria órfã.
        await cred.user.delete()
        throw err
      }
      logPlatformEvent('user_signup', { method: 'email' })
      refresh()
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const schoolFields = (
    <>
      <Field
        label={
          <>
            <LuCake size={14} /> Data de nascimento
          </>
        }
        required
      >
        <input
          type="date"
          required
          value={birthDate}
          onChange={e => setBirthDate(e.target.value)}
        />
      </Field>

      <div className="a2l-grid a2l-grid--2">
        <Field
          label={
            <>
              <LuUser size={14} /> Você é
            </>
          }
          required
        >
          <select required value={role} onChange={e => setRole(e.target.value)}>
            <option value="">Selecione…</option>
            {ROLE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>

        <Field
          label={
            <>
              <LuGraduationCap size={14} /> Série / Ano
            </>
          }
          required={role === 'student'}
          optional={role === 'teacher'}
        >
          <select
            required={role === 'student'}
            value={grade}
            onChange={e => setGrade(e.target.value)}
          >
            <option value="">Selecione…</option>
            {GRADE_OPTIONS.map(g => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label={
          <>
            <LuSchool size={14} /> Escola
          </>
        }
        required
        hint="Escolha na lista ou digite o nome da sua escola."
      >
        <input
          list="schools"
          required
          placeholder="Nome da escola"
          value={school}
          onChange={e => setSchool(e.target.value)}
        />
      </Field>
      <datalist id="schools">
        {SCHOOLS.map(s => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </>
  )

  return (
    <AuthShell>
      <Card hero>
        <div style={{ textAlign: 'center', marginBottom: 22 }}>
          <h2 style={{ fontSize: 'var(--a2l-text-xl)' }}>Criar sua conta</h2>
          <p style={{ color: 'var(--a2l-ink-500)', marginTop: 6 }}>Leva menos de um minuto.</p>
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
          <div className="a2l-stack" style={{ gap: 16 }}>
            {schoolFields}
            <Button
              variant="secondary"
              size="lg"
              block
              onClick={handleGoogleRegister}
              loading={loading}
              icon={<FcGoogle size={20} />}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Cadastrando…' : 'Cadastrar com Google'}
            </Button>
          </div>
        ) : (
          <form onSubmit={handleEmailRegister} className="a2l-stack" style={{ gap: 16 }}>
            <Field
              label={
                <>
                  <LuUser size={14} /> Nome completo
                </>
              }
              required
            >
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Seu nome"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </Field>

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

            <div className="a2l-grid a2l-grid--2">
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
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
              </Field>

              <Field
                label={
                  <>
                    <LuLock size={14} /> Confirmar
                  </>
                }
                required
                error={
                  confirmPassword && password !== confirmPassword ? 'As senhas não conferem.' : ''
                }
              >
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </Field>
            </div>

            {schoolFields}

            <Button
              type="submit"
              size="lg"
              block
              loading={loading}
              icon={<LuUserPlus size={18} />}
              style={{ marginTop: 4 }}
            >
              {loading ? 'Cadastrando…' : 'Criar conta'}
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
          Já tem conta? <Link to="/login">Entre aqui</Link>
        </p>
      </Card>
    </AuthShell>
  )
}
