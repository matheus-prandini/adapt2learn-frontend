// Espelho em JS dos tokens de src/styles/global.css — para estilos inline,
// gráficos (recharts) e o tema do MUI, que não leem CSS custom properties.

export const colors = {
  brand: {
    50: '#EEF0FF',
    100: '#E1E4FF',
    200: '#C7CCFF',
    300: '#A6ACFF',
    400: '#868DF7',
    500: '#6C5CE7',
    600: '#5A48DC',
    700: '#4938B4',
    800: '#372A87',
  },
  mint: { 50: '#E6FAF6', 100: '#C6F3EB', 500: '#10B9A3', 600: '#0C9B88', 700: '#0A7A6B' },
  sun: { 50: '#FFF7E6', 100: '#FFEDC2', 500: '#FFB020', 600: '#E4930A', 700: '#B87407' },
  ink: {
    900: '#0C1024',
    800: '#1B2137',
    700: '#333B54',
    600: '#4E5773',
    500: '#6B748F',
    400: '#939BB3',
    300: '#B9C0D2',
  },
  line: '#E4E7F2',
  lineSoft: '#EFF1F8',
  surface: '#FFFFFF',
  surface2: '#F7F8FD',
  bg: '#F2F3FB',
  success: '#12A150',
  danger: '#E11D48',
  warning: '#C2740A',
  info: '#2563EB',
}

// Mesma estrutura de `colors`, com a luminosidade invertida dentro de cada
// escala: 50–200 continuam sendo fundos, 600–800 continuam sendo texto.
// Mantém em sincronia com o bloco :root[data-theme='dark'] de global.css.
export const darkColors = {
  brand: {
    50: '#1B1E3A',
    100: '#262A54',
    200: '#343A72',
    300: '#4C55A4',
    400: '#7A82F0',
    500: '#7B6BF2',
    600: '#A49BFF',
    700: '#BDB6FF',
    800: '#D6D1FF',
  },
  mint: { 50: '#0D2A28', 100: '#12403B', 500: '#17C9B1', 600: '#4EDCC7', 700: '#86EBDA' },
  sun: { 50: '#2E220C', 100: '#46340F', 500: '#FFB93A', 600: '#FFC968', 700: '#FFDB9B' },
  ink: {
    900: '#F3F5FB',
    800: '#E3E7F1',
    700: '#C8CFDE',
    600: '#A6AEC4',
    500: '#8B94AB',
    400: '#6E7691',
    300: '#4F5773',
  },
  line: '#272F49',
  lineSoft: '#1F2740',
  surface: '#141A2E',
  surface2: '#1B2238',
  bg: '#0B0F1E',
  success: '#4ADE80',
  danger: '#FB7185',
  warning: '#FBBF24',
  info: '#7CA9FF',
}

/** Paleta ativa para código que não consegue ler CSS custom properties. */
export function getColors(mode) {
  return mode === 'dark' ? darkColors : colors
}

// Paleta categórica para gráficos: distinguível e coerente com a marca.
export const chartPalette = [
  colors.brand[500],
  colors.mint[500],
  colors.sun[500],
  '#F472B6',
  '#38BDF8',
  '#A78BFA',
  '#FB923C',
  '#4ADE80',
]

// No escuro as séries precisam de mais luminosidade para separar do fundo.
export const darkChartPalette = [
  '#948AFF',
  '#2BD9C0',
  '#FFC155',
  '#F9A8D4',
  '#7DD3FC',
  '#C4B5FD',
  '#FDBA74',
  '#86EFAC',
]

export function getChartPalette(mode) {
  return mode === 'dark' ? darkChartPalette : chartPalette
}

export const font = {
  display:
    "'Plus Jakarta Sans', 'Nunito', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  body: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  mono: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, monospace",
}

export const radius = { sm: 8, md: 12, lg: 16, xl: 20, xxl: 28, pill: 999 }

export const shadow = {
  xs: '0 1px 2px rgba(12, 16, 36, 0.05)',
  sm: '0 1px 2px rgba(12, 16, 36, 0.05), 0 2px 8px -4px rgba(12, 16, 36, 0.10)',
  md: '0 1px 2px rgba(12, 16, 36, 0.04), 0 8px 24px -10px rgba(12, 16, 36, 0.16)',
  lg: '0 2px 4px rgba(12, 16, 36, 0.04), 0 18px 44px -16px rgba(12, 16, 36, 0.22)',
  brand: '0 8px 20px -8px rgba(108, 92, 231, 0.55)',
}

export const darkShadow = {
  xs: '0 1px 2px rgba(0, 0, 0, 0.36)',
  sm: '0 1px 2px rgba(0, 0, 0, 0.4), 0 2px 8px -4px rgba(0, 0, 0, 0.5)',
  md: '0 1px 2px rgba(0, 0, 0, 0.4), 0 8px 24px -10px rgba(0, 0, 0, 0.6)',
  lg: '0 2px 4px rgba(0, 0, 0, 0.45), 0 18px 44px -16px rgba(0, 0, 0, 0.7)',
  brand: '0 8px 22px -10px rgba(123, 107, 242, 0.75)',
}

export function getShadow(mode) {
  return mode === 'dark' ? darkShadow : shadow
}

const tokens = {
  colors,
  darkColors,
  chartPalette,
  darkChartPalette,
  font,
  radius,
  shadow,
  darkShadow,
}
export default tokens
