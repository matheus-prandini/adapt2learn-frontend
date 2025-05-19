// src/pages/Dashboard.js
import React, { useState, useEffect } from 'react';
import { useNavigate }           from 'react-router-dom';
import { auth }                  from '../firebase';
import { useAuthState }          from 'react-firebase-hooks/auth';
import { signOut }               from 'firebase/auth';

export default function Dashboard() {
  const [user, loadingAuth]       = useAuthState(auth);
  const [username, setUsername]   = useState('');
  const [profile, setProfile]     = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const navigate                  = useNavigate();

  useEffect(() => {
    if (!user) {
      setLoadingProfile(false);
      return;
    }

    (async () => {
      try {
        const token = await user.getIdToken();
        const res   = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/me', {
          headers: { Authorization: 'Bearer ' + token }
        });
        if (!res.ok) throw new Error('Falha ao carregar perfil');

        const data = await res.json();
        setProfile(data);

        const firebaseName = user.displayName;
        const backendName  = data.name;
        setUsername(firebaseName || backendName || '');
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingProfile(false);
      }
    })();
  }, [user]);

  if (loadingAuth || loadingProfile) {
    return <p style={{ padding:20, textAlign:'center' }}>Carregando…</p>;
  }
  if (!user) {
    navigate('/login');
    return <p style={{ padding:20, textAlign:'center' }}>Redirecionando ao login…</p>;
  }

  const isTeacher = profile?.role === 'teacher';

  return (
    <div style={{
      maxWidth: 500,
      margin: '40px auto',
      padding: 24,
      backgroundColor: '#e3f2fd',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#1565c0', marginBottom: 12 }}>
        🎉 Olá, {username || 'Amigo'}!
      </h2>
      <p style={{ marginBottom: 24, fontSize:16, color:'#333' }}>
        Escolha uma opção para começar:
      </p>

      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        {1 == 2 && isTeacher && ( // TODO: habilitar quando o backend estiver pronto
          <button
            onClick={() => navigate('/documents')}
            style={{
              padding:12,fontSize:16,
              backgroundColor:'#29b6f6',
              color:'#fff',border:'none',
              borderRadius:8,cursor:'pointer'
            }}
          >
            📂 Documentos
          </button>
        )}

        <button
          onClick={() => navigate('/select')}
          style={{
            padding:12,fontSize:16,
            backgroundColor:'#66bb6a',
            color:'#fff',border:'none',
            borderRadius:8,cursor:'pointer'
          }}
        >
          🕹️ Jogar
        </button>

        <button
          onClick={async () => {
            await signOut(auth);
            navigate('/login');
          }}
          style={{
            padding:12,fontSize:16,
            backgroundColor:'#ef5350',
            color:'#fff',border:'none',
            borderRadius:8,cursor:'pointer'
          }}
        >
          🚪 Sair
        </button>
      </div>
    </div>
  );
}
