import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

export default function Register() {
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const schoolOptions = [ 'Colégio Objetivo', 'Escola ABC', 'Escola Municipal XYZ' ];

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      const res = await fetch('http://localhost:8080/api/signup-google', {
        method: 'POST',
        headers: {
          'Content-Type':'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          birth_date: birthDate,
          grade_level: grade,
          school_id: school
        })
      });
      if (!res.ok) {
        await signOut(auth);
        throw new Error(await res.text());
      }

      navigate('/');
    } catch(err) {
      alert('Erro no cadastro com Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{maxWidth:400,margin:'auto',padding:20}}>
      <h2>Cadastro</h2>
      <p>Preencha seus dados e depois clique em “Cadastrar com Google”:</p>

      <input required type="date"
             placeholder="Data de Nascimento"
             value={birthDate}
             onChange={e=>setBirthDate(e.target.value)} />

      <input required placeholder="Série / Ano"
             value={grade}
             onChange={e=>setGrade(e.target.value)} />

      <input required list="schools"
             placeholder="Nome da Escola"
             value={school}
             onChange={e=>setSchool(e.target.value)} />
      <datalist id="schools">
        {schoolOptions.map(s => <option key={s} value={s}/>)}
      </datalist>

      <button onClick={handleGoogleRegister} disabled={loading}>
        {loading ? 'Cadastrando…' : 'Cadastrar com Google'}
      </button>

      <p>Já tem conta? <Link to="/login">Entre aqui</Link></p>
    </div>
  );
}
