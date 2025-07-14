import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import GameSelect from './pages/GameSelect'
import Report from './pages/Report'
import Warmup from './pages/Warmup'
import Questionnaire from './pages/Questionnaire'
import Admin from './pages/Admin'
import GameDetails from './pages/GameDetails'
import PrivateRoute from './components/PrivateRoute'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/" element={
        <PrivateRoute>
          <Dashboard/>
        </PrivateRoute>
      }/>

      <Route path="/documents" element={
        <PrivateRoute>
          <Documents/>
        </PrivateRoute>
      }/>

      <Route path="/select"   element={<PrivateRoute><GameSelect/></PrivateRoute>} />

      <Route path="/report"    element={<Report />} />

      <Route path="/warmup"    element={<Warmup />} />

      <Route path="/questionnaire" element={<Questionnaire />} />

      <Route path="/admin" element={<Admin />} />

      <Route path="/admin/games/:id" element={<GameDetails />} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
