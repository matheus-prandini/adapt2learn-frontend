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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const checkProfile = async (token) => {
    const res = await fetch('http://localhost:8080/api/me', {
      headers: { Authorization: 'Bearer ' + token }
    });
    return res.ok;
  };

  const handleGoogleSignIn = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const token = await result.user.getIdToken();
      if (!await checkProfile(token)) {
        await signOut(auth);
        alert('Usuário não cadastrado. Faça o registro primeiro.');
        return;
      }
      navigate('/');
    } catch (err) {
      alert('Erro ao entrar com Google: ' + err.message);
    }
  };

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

      <button
        onClick={handleGoogleSignIn}
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
          cursor: 'pointer'
        }}
      >
        <img
          src="/icons/google.png"
          alt="Google"
          style={{ width: 24, height: 24 }}
        />
        Entrar com Google
      </button>

      <p style={{ marginTop: 20, fontSize: 14, color: '#555' }}>
        Não tem conta?{' '}
        <Link to="/register" style={{ color: '#d81b60', fontWeight: 'bold' }}>
          Cadastre-se
        </Link>
      </p>
    </div>
  );
}