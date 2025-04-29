import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

export default function Dashboard() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login');
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Bem-vindo(a)!</h1>
      <button onClick={handleLogout}>Sair</button>
      <hr/>
      <h2>O que deseja fazer?</h2>
      <ul>
        <li><Link to="/upload">Upload de Documento</Link></li>
        <li><Link to="/games">Jogos</Link></li>
      </ul>
    </div>
  );
}
