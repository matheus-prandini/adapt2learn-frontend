// src/pages/Login.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut
} from 'firebase/auth';

export default function Login() {
  const [method, setMethod]     = useState('google');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  const checkProfile = async (token) => {
    const res = await fetch('http://localhost:8080/api/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    return res.ok;
  };

  async function handleGoogleSignIn() {
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      if (!await checkProfile(token)) {
        await signOut(auth);
        setError('Usuário não cadastrado. Faça o registro primeiro.');
        return;
      }
      navigate('/');
    } catch (err) {
      setError('Erro ao entrar com Google: ' + err.message);
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
        return;
      }
      navigate('/');
    } catch (err) {
      setError('Erro ao entrar: ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      maxWidth: 360,
      margin: '60px auto',
      padding: 24,
      backgroundColor: '#fce4ec',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#d81b60', marginBottom: 16 }}>🎉 Bem-vindo!</h2>

      {/* Toggle entre Google / Email */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'center', gap: 8 }}>
        <button
          onClick={() => setMethod('google')}
          style={{
            padding:'8px 16px',
            backgroundColor: method==='google' ? '#d81b60' : '#f8bbd0',
            color:'#fff',
            border:'none',
            borderRadius:4,
            cursor:'pointer'
          }}
        >
          Google
        </button>
        <button
          onClick={() => setMethod('email')}
          style={{
            padding:'8px 16px',
            backgroundColor: method==='email' ? '#d81b60' : '#f8bbd0',
            color:'#fff',
            border:'none',
            borderRadius:4,
            cursor:'pointer'
          }}
        >
          E-mail
        </button>
      </div>

      {method === 'google' ? (
        <>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              width: '100%',
              padding: 12,
              backgroundColor: '#4285f4',
              color: '#fff',
              fontSize: 16,
              border: 'none',
              borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            <img
              src="/icons/google.png"
              alt="Google"
              style={{ width: 24, height: 24 }}
            />
            {loading ? 'Entrando…' : 'Entrar com Google'}
          </button>
        </>
      ) : (
        <form onSubmit={handleEmailSignIn} style={{ display:'flex', flexDirection:'column', gap:12, textAlign:'left' }}>
          <label>📧 E-mail</label>
          <input
            type="email"
            required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #ccc', fontSize:16 }}
          />

          <label>🔒 Senha</label>
          <input
            type="password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={{ width:'100%', padding:10, borderRadius:6, border:'1px solid #ccc', fontSize:16 }}
          />

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop:8,
              padding:12,
              backgroundColor:'#d81b60',
              color:'#fff',
              fontSize:16,
              border:'none',
              borderRadius:6,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
      )}

      {error && (
        <p style={{ color:'red', marginTop:12, fontSize:14 }}>
          {error}
        </p>
      )}

      <p style={{ marginTop: 20, fontSize: 14, color: '#555' }}>
        Não tem conta?{' '}
        <Link to="/register" style={{ color: '#d81b60', fontWeight: 'bold' }}>
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}
