import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import GameSelect from './pages/GameSelect'
import Warmup from './pages/Warmup'
import Report from './pages/Report'
import Questionnaire from './pages/Questionnaire'
import PrivateRoute from './components/PrivateRoute'
import { Loader } from './components/ui'
import { TEACHER_ROLES } from './auth/ProfileContext'

// As telas de professor/admin carregam MUI, Recharts, react-select e
// react-dropzone. O aluno nunca abre nenhuma delas — então nenhuma entra no
// bundle inicial. As páginas do aluno continuam eager: primeiro paint rápido
// em escola com internet ruim é o que importa.
const TeacherCreation = lazy(() => import('./pages/TeacherCreation'))
const Admin = lazy(() => import('./pages/Admin'))
const GameDetails = lazy(() => import('./pages/GameDetails'))
const NewGameForm = lazy(() => import('./pages/NewGameForm'))

// Toda rota autenticada passa pelo PrivateRoute; as de professor/admin também
// exigem papel.
const Private = ({ children }) => <PrivateRoute>{children}</PrivateRoute>
const Staff = ({ children }) => <PrivateRoute roles={TEACHER_ROLES}>{children}</PrivateRoute>

export default function App() {
  return (
    <Suspense fallback={<Loader label="Carregando…" />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route path="/" element={<Private><Dashboard /></Private>} />
        <Route path="/select" element={<Private><GameSelect /></Private>} />
        <Route path="/warmup" element={<Private><Warmup /></Private>} />
        <Route path="/report" element={<Private><Report /></Private>} />
        <Route path="/questionnaire" element={<Private><Questionnaire /></Private>} />

        <Route path="/creation" element={<Staff><TeacherCreation /></Staff>} />
        <Route path="/admin" element={<Staff><Admin /></Staff>} />
        <Route path="/admin/games/new" element={<Staff><NewGameForm /></Staff>} />
        <Route path="/admin/games/:id" element={<Staff><GameDetails /></Staff>} />

        {/* Aliases antigos — os jogos (bundles externos) podem apontar para eles. */}
        <Route path="/dashboard" element={<Navigate to="/" replace />} />
        <Route path="/documents" element={<Navigate to="/creation" replace />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
