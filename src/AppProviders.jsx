import React, { useMemo } from 'react'
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import { ProfileProvider } from './auth/ProfileContext'
import { createMuiTheme } from './theme/muiTheme'

// Mantém o MUI (DatePicker, popovers) no mesmo modo do resto da plataforma.
function MuiBridge({ children }) {
  const { theme } = useTheme()
  const muiTheme = useMemo(() => createMuiTheme(theme), [theme])
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>
}

// Um único container de toasts para o app inteiro, no tema atual.
function GlobalToasts() {
  const { theme } = useTheme()
  return (
    <ToastContainer
      position="top-right"
      autoClose={3500}
      hideProgressBar
      newestOnTop
      closeOnClick
      pauseOnHover
      theme={theme}
    />
  )
}

/**
 * Provedores globais, do mais externo ao mais interno:
 * tema → MUI → ErrorBoundary → perfil/sessão. Os toasts ficam fora do
 * ErrorBoundary para continuarem funcionando se a árvore cair.
 */
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <MuiBridge>
        <ErrorBoundary>
          <ProfileProvider>{children}</ProfileProvider>
        </ErrorBoundary>
        <GlobalToasts />
      </MuiBridge>
    </ThemeProvider>
  )
}
