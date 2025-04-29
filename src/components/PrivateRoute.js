import React from 'react';
import { auth } from '../firebase';
import { Navigate } from 'react-router-dom';
import { useAuthState } from 'react-firebase-hooks/auth';

export default function PrivateRoute({ children }) {
  const [user, loading] = useAuthState(auth);
  if (loading) return <div>Loading...</div>;
  return user ? children : <Navigate to="/login"/>;
}