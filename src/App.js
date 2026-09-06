import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import TeacherCreation from './pages/TeacherCreation'
import GameSelect from './pages/GameSelect'
import Report from './pages/Report'
import Warmup from './pages/Warmup'
import Questionnaire from './pages/Questionnaire'
import Admin from './pages/Admin'
import GameDetails from './pages/GameDetails'
import NewGameForm from './pages/NewGameForm'
import PrivateRoute from './components/PrivateRoute'
import { TEACHER_ROLES } from './auth/ProfileContext'

// Toda rota autenticada passa pelo PrivateRoute; as de professor/admin também
// exigem papel. Antes, metade das telas fazia a própria checagem — cada uma de
// um jeito, e /questionnaire quebrava num F5 antes do Firebase resolver.
const Private = ({ children }) => <PrivateRoute>{children}</PrivateRoute>
const Staff = ({ children }) => <PrivateRoute roles={TEACHER_ROLES}>{children}</PrivateRoute>

export default function App() {
  return (
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
  )
}
