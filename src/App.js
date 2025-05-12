import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Documents from './pages/Documents'
import GameSelect from './pages/GameSelect'
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

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
