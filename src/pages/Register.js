import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const navigate = useNavigate();

  const schoolOptions = [
    'Colégio Objetivo',
  ];

  const handleSubmit = async e => {
    e.preventDefault();
    try {
      const res = await fetch('/api/signup', {
        method: 'POST',
        headers: { 'Content-Type':'application/json' },
        body: JSON.stringify({
          name,
          mail: email,
          password,
          birth_date: birthDate,
          grade_level: grade,
          school_id: school
        })
      });
      if (!res.ok) throw new Error(await res.text());
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch(err) {
      alert('Erro no cadastro: ' + err.message);
    }
  };

  return (
    <div style={{maxWidth:400,margin:'auto',padding:20}}>
      <h2>Cadastro</h2>
      <form onSubmit={handleSubmit}>
        <input required placeholder="Nome" value={name} onChange={e=>setName(e.target.value)} />
        <input required type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} />
        <input required type="password" placeholder="Senha" value={password} onChange={e=>setPassword(e.target.value)} />
        <input required type="date" placeholder="Data de Nascimento" value={birthDate} onChange={e=>setBirthDate(e.target.value)} />
        <input required placeholder="Série / Ano" value={grade} onChange={e=>setGrade(e.target.value)} />

        <input
          required
          list="schools"
          placeholder="Nome da Escola"
          value={school}
          onChange={e=>setSchool(e.target.value)}
        />
        <datalist id="schools">
          {schoolOptions.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>

        <button type="submit">Cadastrar</button>
      </form>
      <p>
        Já tem conta? <Link to="/login">Entre aqui</Link>
      </p>
    </div>
  );
}
