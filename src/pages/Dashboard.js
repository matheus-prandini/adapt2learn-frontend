import React from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { useAuthState } from 'react-firebase-hooks/auth';
import { signOut } from 'firebase/auth';

export default function Dashboard() {
  const [user, loading] = useAuthState(auth);
  const navigate = useNavigate();

  if (loading) return <p>Carregando...</p>;
  if (!user) return <p>Redirecionando ao login...</p>;

  return (
    <div style={{padding:20}}>
      <h2>Bem-vindo, {user.name}</h2>
      <button onClick={()=>navigate('/upload')}>Upload de Documento</button>
      <button onClick={()=>navigate('/games')}>Jogos</button>
      <button onClick={async ()=>{ await signOut(auth); navigate('/login'); }}>
        Sair
      </button>
    </div>
  );
}
