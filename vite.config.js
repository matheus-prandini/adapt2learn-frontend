import { defineConfig } from 'vitest/config'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Em produção o Firebase Hosting reescreve /api/** para o Cloud Run e
// /games/** para a function serveGame (firebase.json). Em desenvolvimento
// esses rewrites não existem: o proxy abaixo os replica, e como a requisição
// sai do Node (server-to-server) não há preflight nem CORS.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const apiTarget =
    env.DEV_PROXY_API_TARGET || 'https://adapt2learn-895112363610.us-central1.run.app'
  const gamesTarget = env.DEV_PROXY_GAMES_TARGET || 'https://adapt2learn-api.web.app'

  return {
    plugins: [react()],

    // Mesmo diretório que o CRA usava — firebase.json aponta para "build".
    build: {
      outDir: 'build',
      // Sem isto o Vite emite sintaxe "baseline widely available" (class fields,
      // `||=`), que iPads em iOS ≤14.4 e Chromes ≤84 rejeitam com tela branca —
      // dispositivos comuns em escola. Rebaixa só a sintaxe (não faz polyfill).
      target: ['chrome80', 'safari13.1', 'firefox78', 'edge80'],
      // O chunk do Admin (MUI + Recharts + date pickers) passa de 500 kB minificado,
      // mas é carregado sob demanda só por professor/admin — o aviso seria ruído no CI.
      chunkSizeWarningLimit: 800,
    },

    server: {
      port: 3000,
      strictPort: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true, // o Cloud Run roteia pelo header Host
          // Cold start do Cloud Run leva ~10s; o padrão devolvia 504 antes.
          timeout: 120_000,
          proxyTimeout: 120_000,
        },
        '/games': { target: gamesTarget, changeOrigin: true },
      },
    },

    preview: { port: 3000 },

    test: {
      environment: 'node',
      globals: true,
      include: ['src/**/*.test.{js,jsx}'],
    },
  }
})
