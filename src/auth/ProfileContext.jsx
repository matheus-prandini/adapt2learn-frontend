import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { useAuthState } from 'react-firebase-hooks/auth'
import { signOut as firebaseSignOut } from 'firebase/auth'
import { auth } from '../firebase'
import { fetchProfile } from '../api/profile'

/** Papéis com acesso à área de criação e ao painel administrativo. */
export const TEACHER_ROLES = ['teacher', 'admin']

const ProfileContext = createContext(null)

/**
 * Estado de autenticação + perfil do backend, carregado uma única vez por
 * sessão. Substitui o padrão de cada página refazer `/me` no seu useEffect.
 *
 *   user     — usuário Firebase (null se deslogado)
 *   profile  — resposta de /me (null enquanto carrega ou se deslogado)
 *   loading  — true até termos user *e* profile (ou a certeza de que não há user)
 *   error    — ApiError se /me falhou (ex.: conta Firebase sem cadastro → 404)
 *
 * `loading` é DERIVADO dos dados, não de uma flag setada em efeito: há um
 * render entre o Firebase resolver o usuário e o efeito de /me começar, e uma
 * flag ainda falsa nesse render fazia o PrivateRoute com `roles` redirecionar
 * professor/admin para "/" num F5.
 */
export function ProfileProvider({ children }) {
  const [user, authLoading] = useAuthState(auth)
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState(null)
  const [refreshTick, setRefreshTick] = useState(0)

  useEffect(() => {
    if (!user) {
      setProfile(null)
      setError(null)
      return undefined
    }

    let cancelled = false
    setError(null)

    fetchProfile()
      .then(p => {
        if (!cancelled) setProfile(p)
      })
      .catch(e => {
        if (cancelled) return
        setProfile(null)
        setError(e)
      })

    return () => {
      cancelled = true
    }
  }, [user, refreshTick])

  // Limpa o erro já aqui para o render seguinte mostrar o Loader, não o erro antigo.
  const refresh = useCallback(() => {
    setError(null)
    setRefreshTick(t => t + 1)
  }, [])
  const signOut = useCallback(() => firebaseSignOut(auth), [])

  // Com perfil em mãos um refresh não volta ao Loader — só o primeiro carregamento.
  const loading = authLoading || (!!user && !profile && !error)

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      refresh,
      signOut,
      isTeacher: TEACHER_ROLES.includes(profile?.role),
      displayName: user?.displayName || profile?.name || '',
    }),
    [user, profile, loading, error, refresh, signOut]
  )

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>
}

export function useProfile() {
  const ctx = useContext(ProfileContext)
  if (!ctx) throw new Error('useProfile precisa estar dentro de <ProfileProvider>')
  return ctx
}
