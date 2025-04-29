import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Upload from './pages/Upload';
import Games from './pages/Games';
import PrivateRoute from './components/PrivateRoute';

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login/>} />
      <Route path="/register" element={<Register/>} />
      <Route path="/" element={
        <PrivateRoute><Dashboard/></PrivateRoute>
      } />
      <Route path="/upload" element={
        <PrivateRoute><Upload/></PrivateRoute>
      } />
      <Route path="/games" element={
        <PrivateRoute><Games/></PrivateRoute>
      } />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
