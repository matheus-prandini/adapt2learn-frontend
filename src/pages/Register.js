// src/pages/Register.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, googleProvider } from '../firebase';
import {
  signInWithPopup,
  createUserWithEmailAndPassword,
  signOut
} from 'firebase/auth';

export default function Register() {
  const [method,          setMethod]          = useState('google');
  const [name,            setName]            = useState('');
  const [email,           setEmail]           = useState('');
  const [password,        setPassword]        = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [birthDate,       setBirthDate]       = useState('');
  const [role,            setRole]            = useState('');
  const [grade,           setGrade]           = useState('');
  const [school,          setSchool]          = useState('');
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState('');
  const navigate = useNavigate();

  const schoolOptions = ['ColégioObjetivo', 'Eseba', 'Associação21Down'];
  const roleOptions = [
    { label: 'Aluno',    value: 'student' },
    { label: 'Professor',value: 'teacher' }
  ];
  const gradeOptions = [
    '1º ano EF I','2º ano EF I','3º ano EF I','4º ano EF I','5º ano EF I',
    '6º ano EF II','7º ano EF II','8º ano EF II','9º ano EF II',
    '1º ano EM','2º ano EM','3º ano EM'
  ];

  async function handleGoogleRegister() {
    setError(''); setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      const token = await user.getIdToken();
      const payload = {
        birth_date:  birthDate,
        role,
        school_id:   school
      };
      // só envia grade_level se for aluno
      if (role === 'student') payload.grade_level = grade;

      const res = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/signup-google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        await signOut(auth);
        throw new Error(await res.text());
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailRegister(e) {
    e.preventDefault();
    if (password !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }
    setError(''); setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      const token = await cred.user.getIdToken();
      const payload = {
        name,
        mail:         email,
        password:    password,
        role,
        birth_date:   birthDate,
        school_id:    school
      };
      if (role === 'student') payload.grade_level = grade;

      const res = await fetch('https://adapt2learn-895112363610.us-central1.run.app/api/signup', {
        method: 'POST',
        headers: { 'Content-Type':'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        await cred.user.delete();
        throw new Error(await res.text());
      }
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.header}>🎈 Cadastro</h2>

      {/* Toggle de método */}
      <div style={styles.toggle}>
        <button
          onClick={() => setMethod('google')}
          style={{
            ...styles.tab,
            backgroundColor: method==='google' ? '#388e3c' : '#a5d6a7'
          }}
        >Google</button>
        <button
          onClick={() => setMethod('email')}
          style={{
            ...styles.tab,
            backgroundColor: method==='email' ? '#388e3c' : '#a5d6a7'
          }}
        >E-mail</button>
      </div>

      {method === 'google' ? (
        <>
          <p style={styles.sub}>Preencha e clique em "Cadastrar com Google"</p>
          <div style={styles.form}>
            <label>🎂 Nascimento</label>
            <input
              type="date" required
              value={birthDate}
              onChange={e => setBirthDate(e.target.value)}
              style={styles.input}
            />

            <label>👩‍🏫 Você é</label>
            <select
              required
              value={role}
              onChange={e => setRole(e.target.value)}
              style={styles.input}
            >
              <option value="">Selecione…</option>
              {roleOptions.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <label>
              📚 Série / Ano
              {role === 'teacher' && ' (opcional)'}
            </label>
            <select
              required={role === 'student'}
              value={grade}
              onChange={e => setGrade(e.target.value)}
              style={styles.input}
            >
              <option value="">Selecione…</option>
              {gradeOptions.map(g => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>

            <label>🏫 Escola</label>
            <input
              list="schools" required
              value={school}
              onChange={e => setSchool(e.target.value)}
              style={styles.input}
            />
            <datalist id="schools">
              {schoolOptions.map(s => <option key={s} value={s}/> )}
            </datalist>
          </div>

          <button
            onClick={handleGoogleRegister}
            disabled={loading}
            style={styles.submit}
          >
            {loading ? 'Cadastrando…' : 'Cadastrar com Google'}
          </button>
        </>
      ) : (
        <form onSubmit={handleEmailRegister} style={styles.form}>
          <label>👤 Nome Completo</label>
          <input
            type="text" required
            value={name}
            onChange={e => setName(e.target.value)}
            style={styles.input}
          />

          <label>📧 E-mail</label>
          <input
            type="email" required
            value={email}
            onChange={e => setEmail(e.target.value)}
            style={styles.input}
          />

          <label>🔒 Senha</label>
          <input
            type="password" required
            value={password}
            onChange={e => setPassword(e.target.value)}
            style={styles.input}
          />

          <label>🔒 Confirmar Senha</label>
          <input
            type="password" required
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            style={styles.input}
          />

          <label>🎂 Nascimento</label>
          <input
            type="date" required
            value={birthDate}
            onChange={e => setBirthDate(e.target.value)}
            style={styles.input}
          />

          <label>👩‍🏫 Você é</label>
          <select
            required
            value={role}
            onChange={e => setRole(e.target.value)}
            style={styles.input}
          >
            <option value="">Selecione…</option>
            {roleOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <label>
            📚 Série / Ano
            {role === 'teacher' && ' (opcional)'}
          </label>
          <select
            required={role === 'student'}
            value={grade}
            onChange={e => setGrade(e.target.value)}
            style={styles.input}
          >
            <option value="">Selecione…</option>
            {gradeOptions.map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>

          <label>🏫 Escola</label>
          <input
            list="schools" required
            value={school}
            onChange={e => setSchool(e.target.value)}
            style={styles.input}
          />
          <datalist id="schools">
            {schoolOptions.map(s => <option key={s} value={s}/> )}
          </datalist>

          <button type="submit" disabled={loading} style={styles.submit}>
            {loading ? 'Cadastrando…' : 'Cadastrar com E-mail'}
          </button>
        </form>
      )}

      {error && <p style={styles.error}>{error}</p>}

      <p style={styles.footer}>
        Já tem conta?{' '}
        <Link to="/login" style={styles.link}>
          Entre aqui
        </Link>
      </p>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: 400,
    margin: '60px auto',
    padding: 24,
    backgroundColor: '#e8f5e9',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  header: { color:'#388e3c', marginBottom:16, fontSize:24 },
  toggle: { marginBottom:24 },
  tab: {
    padding:'8px 16px',
    marginRight:8,
    color:'#fff',
    border:'none',
    borderRadius:4,
    cursor:'pointer'
  },
  sub: { fontSize:14, color:'#555', marginBottom:16 },
  form: { display:'flex', flexDirection:'column', gap:12, textAlign:'left' },
  input: {
    width:'100%', padding:10, borderRadius:6,
    border:'1px solid #ccc', fontSize:16
  },
  submit: {
    marginTop:16,
    padding:12,
    backgroundColor:'#388e3c',
    color:'#fff',
    fontSize:16,
    border:'none',
    borderRadius:6,
    cursor:'pointer'
  },
  error: { color:'red', marginTop:12, fontSize:14 },
  footer: { marginTop:20, fontSize:14, color:'#555' },
  link:   { color:'#388e3c', fontWeight:'bold' }
};
