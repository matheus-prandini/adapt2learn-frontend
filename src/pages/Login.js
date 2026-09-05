// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';
import { FcGoogle } from 'react-icons/fc';
import { LuLock, LuMail, LuLogIn } from 'react-icons/lu';
import { AuthShell, Card, Button, Field, Alert, SegmentedControl } from '../components/ui';
import { API_BASE_URL } from '../api/config';

export default function Login() {
  const [method, setMethod]     = useState('google');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const checkProfile = async (token) => {
    const res = await fetch(`${API_BASE_URL}/me`, {
      headers: { Authorization: 'Bearer ' + token }
    });
    return res.ok;
  };

  // função utilitária para logar eventos de login
  async function logLoginEvent(token, status, method, message = null) {
    try {
      await fetch(`${API_BASE_URL}/events/platform`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token
        },
        body: JSON.stringify({
          event_type: status === "success" ? "login_success" : "login_failed",
          payload: { method, message }
        })
      });
    } catch (err) {
      console.error("Erro ao logar evento de login:", err);
    }
  }

  async function handleGoogleSignIn() {
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      if (!await checkProfile(token)) {
        await signOut(auth);
        setError('Usuário não cadastrado. Faça o registro primeiro.');
        await logLoginEvent(token, "failed", "google", "Usuário não cadastrado");
        return;
      }
      await logLoginEvent(token, "success", "google");
      navigate('/');
    } catch (err) {
      setError('Erro ao entrar com Google: ' + err.message);
      // sem token válido ainda, não dá pra enviar no header → envia sem token
      await logLoginEvent("", "failed", "google", err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      if (!await checkProfile(token)) {
        await signOut(auth);
        setError('Usuário não cadastrado. Faça o registro primeiro.');
        await logLoginEvent(token, "failed", "email", "Usuário não cadastrado");
        return;
      }
      await logLoginEvent(token, "success", "email");
      navigate('/');
    } catch (err) {
      setError('Erro ao entrar: ' + err.message);
      await logLoginEvent("", "failed", "email", err.message);
    } finally {
      setLoading(false);
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
            <Field label={<><LuMail size={14} /> E-mail</>} required>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="voce@escola.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </Field>

            <Field label={<><LuLock size={14} /> Senha</>} required>
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

        {error && <Alert tone="error" className="a2l-anim-in" style={{ marginTop: 18 }}>{error}</Alert>}

        <p style={{ marginTop: 22, textAlign: 'center', fontSize: 'var(--a2l-text-base)', color: 'var(--a2l-ink-500)' }}>
          Não tem conta? <Link to="/register">Cadastre-se</Link>
        </p>
      </Card>
    </AuthShell>
  );
}
