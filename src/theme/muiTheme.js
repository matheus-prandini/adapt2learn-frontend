import { createTheme } from '@mui/material/styles'
import { getColors, getShadow, font, radius } from './tokens'

// O Admin usa MUI (DatePicker, etc.). Este tema alinha esses componentes ao
// design system para não haver duas linguagens visuais na mesma tela — e
// acompanha o modo claro/escuro escolhido pelo usuário.
export function createMuiTheme(mode = 'light') {
  const colors = getColors(mode)
  const shadow = getShadow(mode)

  return createTheme({
    palette: {
      mode,
      primary: { main: colors.brand[500], dark: colors.brand[700], light: colors.brand[300], contrastText: '#fff' },
      secondary: { main: colors.mint[500], dark: colors.mint[700], light: colors.mint[100], contrastText: '#fff' },
      success: { main: colors.success },
      error: { main: colors.danger },
      warning: { main: colors.sun[600] },
      info: { main: colors.info },
      text: { primary: colors.ink[900], secondary: colors.ink[500] },
      divider: colors.line,
      background: { default: colors.bg, paper: colors.surface },
    },
    typography: {
      fontFamily: font.body,
      h1: { fontFamily: font.display, fontWeight: 800, letterSpacing: '-0.02em' },
      h2: { fontFamily: font.display, fontWeight: 800, letterSpacing: '-0.02em' },
      h3: { fontFamily: font.display, fontWeight: 800, letterSpacing: '-0.02em' },
      h4: { fontFamily: font.display, fontWeight: 700 },
      h5: { fontFamily: font.display, fontWeight: 700 },
      h6: { fontFamily: font.display, fontWeight: 700 },
      button: { fontFamily: font.display, fontWeight: 700, textTransform: 'none' },
    },
    shape: { borderRadius: radius.md },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: radius.md, paddingInline: 18, boxShadow: 'none' },
          containedPrimary: { boxShadow: shadow.brand },
        },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: {
            borderRadius: radius.md,
            backgroundColor: colors.surface,
            '& fieldset': { borderColor: colors.line, borderWidth: 1.5 },
            '&:hover fieldset': { borderColor: colors.ink[300] },
            '&.Mui-focused fieldset': { borderColor: colors.brand[400], borderWidth: 1.5 },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none', borderRadius: radius.lg },
        },
      },
      MuiPopover: {
        styleOverrides: {
          paper: { border: `1px solid ${colors.line}`, boxShadow: shadow.lg },
        },
      },
      MuiTooltip: {
        styleOverrides: {
          tooltip: {
            backgroundColor: mode === 'dark' ? colors.surface2 : colors.ink[900],
            color: mode === 'dark' ? colors.ink[900] : '#fff',
            border: mode === 'dark' ? `1px solid ${colors.line}` : 'none',
            fontFamily: font.body,
            fontSize: 12,
            borderRadius: radius.sm,
          },
        },
      },
    },
  })
}

export default createMuiTheme
