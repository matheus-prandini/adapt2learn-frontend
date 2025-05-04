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
        alert("Usuário não cadastrado. Faça o registro primeiro.");
        return;
      }
      navigate('/');
    } catch (err) {
      alert("Erro ao entrar com Google: " + err.message);
    }
  };

  return (
    <div>
      <p>Não tem conta? <Link to="/register">Cadastre-se</Link></p>
      <button onClick={handleGoogleSignIn}>
        Entrar com Google
      </button>
    </div>
  );
}
