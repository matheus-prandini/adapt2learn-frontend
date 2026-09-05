import React, { useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider } from '@mui/material/styles';
import App from './App';
import { ThemeProvider, useTheme } from './theme/ThemeContext';
import { createMuiTheme } from './theme/muiTheme';
import './styles/global.css';

// Mantém o MUI (DatePicker, popovers) no mesmo modo do resto da plataforma.
function MuiBridge({ children }) {
  const { theme } = useTheme();
  const muiTheme = useMemo(() => createMuiTheme(theme), [theme]);
  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ThemeProvider>
    <MuiBridge>
      <BrowserRouter><App/></BrowserRouter>
    </MuiBridge>
  </ThemeProvider>
);
