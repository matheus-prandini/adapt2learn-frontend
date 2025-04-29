import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, googleProvider } from "../firebase";
import {
  signInWithEmailAndPassword,
  signInWithPopup
} from "firebase/auth";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();
  const handleSubmit = async e => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      alert(err.message);
    }
  };

  async function handleGoogleSignIn() {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      navigate("/");
    } catch (err) {
      alert("Erro ao entrar com Google: " + err.message);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <h2>Login</h2>
        <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" required/>
        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Senha" required/>
        <button type="submit">Entrar</button>
      </form>
      <button onClick={handleGoogleSignIn}>
        Entrar com Google
      </button>
    </div>
  );
}
