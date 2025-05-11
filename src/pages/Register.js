// src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup, signOut } from 'firebase/auth';

export default function Register() {
  const [birthDate, setBirthDate] = useState('');
  const [role, setRole] = useState('');
  const [grade, setGrade] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const schoolOptions = ['Colégio Objetivo', 'Eseba', 'Associação 21 Down'];
  const roleOptions = [
    { label: 'Aluno', value: 'student' },
    { label: 'Professor', value: 'teacher' }
  ];
  const gradeOptions = [
    'Ensino Fundamental I - 1º ano',
    'Ensino Fundamental I - 2º ano',
    'Ensino Fundamental I - 3º ano',
    'Ensino Fundamental I - 4º ano',
    'Ensino Fundamental I - 5º ano',
    'Ensino Fundamental II - 6º ano',
    'Ensino Fundamental II - 7º ano',
    'Ensino Fundamental II - 8º ano',
    'Ensino Fundamental II - 9º ano',
    'Ensino Médio - 1º ano',
    'Ensino Médio - 2º ano',
    'Ensino Médio - 3º ano'
  ];

  const handleGoogleRegister = async () => {
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();

      const res = await fetch('http://localhost:8080/api/signup-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer ' + token
        },
        body: JSON.stringify({
          birth_date: birthDate,
          role: role, // 'student' or 'teacher'
          grade_level: grade,
          school_id: school
        })
      });
      if (!res.ok) {
        await signOut(auth);
        throw new Error(await res.text());
      }

      navigate('/');
    } catch (err) {
      alert('Erro no cadastro com Google: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      maxWidth: 400,
      margin: '60px auto',
      padding: 24,
      backgroundColor: '#e8f5e9',
      borderRadius: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      textAlign: 'center'
    }}>
      <h2 style={{ color: '#388e3c', marginBottom: 16 }}>🎈 Cadastro</h2>
      <p style={{ fontSize: 14, color: '#555', marginBottom: 16 }}>
        Preencha seus dados e depois clique em "Cadastrar com Google":
      </p>

      <form onSubmit={e => { e.preventDefault(); handleGoogleRegister(); }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ textAlign: 'left' }}>
          <label htmlFor="birthDate" style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>🎂 Data de Nascimento</label>
          <input
            id="birthDate"
            required
            type="date"
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #ccc',
              fontSize: 16
            }}
          />
        </div>

        <div style={{ textAlign: 'left' }}>
          <label htmlFor="role" style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>👩‍🏫 Você é</label>
          <select
            id="role"
            required
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #ccc',
              fontSize: 16
            }}
          >
            <option value="">Selecione...</option>
            {roleOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div style={{ textAlign: 'left' }}>
          <label htmlFor="grade" style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>📚 Série / Ano</label>
          <select
            id="grade"
            required
            value={grade}
            onChange={e => setGrade(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #ccc',
              fontSize: 16
            }}
          >
            <option value="">Selecione...</option>
            {gradeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        <div style={{ textAlign: 'left' }}>
          <label htmlFor="school" style={{ fontWeight: 'bold', display: 'block', marginBottom: 4 }}>🏫 Escola</label>
          <input
            id="school"
            required
            list="schools"
            placeholder="Selecione sua escola"
            value={school}
            onChange={e => setSchool(e.target.value)}
            style={{
              width: '100%',
              padding: 10,
              borderRadius: 6,
              border: '1px solid #ccc',
              fontSize: 16
            }}
          />
          <datalist id="schools">
            {schoolOptions.map(s => <option key={s} value={s} />)}
          </datalist>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            padding: 12,
            backgroundColor: '#388e3c',
            color: '#fff',
            fontSize: 16,
            border: 'none',
            borderRadius: 6,
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Cadastrando…' : 'Cadastrar com Google'}
        </button>
      </form>

      <p style={{ marginTop: 20, fontSize: 14, color: '#555' }}>
        Já tem conta?{' '}
        <Link to="/login" style={{ color: '#388e3c', fontWeight: 'bold' }}>
          Entre aqui
        </Link>
      </p>
    </div>
  );
}
