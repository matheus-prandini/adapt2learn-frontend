import React from 'react'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import ErrorBoundary from './components/ErrorBoundary'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import { ProfileProvider } from './auth/ProfileContext'

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
 * tema → ErrorBoundary → perfil/sessão. Os toasts ficam fora do ErrorBoundary
 * para continuarem funcionando se a árvore cair.
 *
 * O ThemeProvider do MUI NÃO fica aqui: o único consumidor de MUI é o
 * DatePicker do MetricsTab (lazy). Montá-lo na raiz colocava MUI + emotion no
 * chunk inicial de todo aluno (+30 kB gzip).
 */
export default function AppProviders({ children }) {
  return (
    <ThemeProvider>
      <ErrorBoundary>
        <ProfileProvider>{children}</ProfileProvider>
      </ErrorBoundary>
      <GlobalToasts />
    </ThemeProvider>
  )
}
