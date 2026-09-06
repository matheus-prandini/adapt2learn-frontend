import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { ProfileProvider } from './auth/ProfileContext';
import { createMuiTheme } from './theme/muiTheme';
import './styles/global.css';

// Mantém o MUI (DatePicker, popovers) no mesmo modo do resto da plataforma.
function MuiBridge({ children }) {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => createMuiTheme(theme), [theme]);
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}

// Um único container de toasts para o app inteiro. Antes só três telas do
// admin montavam o seu — nas demais, toast.error() não aparecia em lugar nenhum.
function GlobalToasts() {
  const { theme } = useTheme();
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
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <MuiBridge>
      <ErrorBoundary>
        <ProfileProvider>
          <BrowserRouter><App/></BrowserRouter>
        </ProfileProvider>
      </ErrorBoundary>
      <GlobalToasts />
    </MuiBridge>
  </ThemeProvider>
);
