/**
 * Proxy do servidor de desenvolvimento (usado só por `npm start`).
 *
 * Em produção o Firebase Hosting reescreve `/api/**` para o Cloud Run e
 * `/games/**` para a function `serveGame` (ver firebase.json). No `npm start`
 * esses rewrites não existem, então:
 *
 *   - `/api/...` cairia no dev server e voltaria o index.html (o `res.json()`
 *     quebra com "Unexpected token <");
 *   - chamar o Cloud Run direto do browser é bloqueado por CORS, porque o
 *     serviço não devolve Access-Control-Allow-Origin para localhost.
 *
 * O proxy resolve os dois: a requisição sai do Node (server-to-server), então
 * não há preflight nem CORS, e o path relativo passa a funcionar igual à
 * produção. `changeOrigin` é obrigatório — o Cloud Run roteia pelo header Host.
 */
const { createProxyMiddleware } = require('http-proxy-middleware')

const API_TARGET =
  process.env.DEV_PROXY_API_TARGET ||
  'https://adapt2learn-895112363610.us-central1.run.app'

// Os jogos são servidos por uma Cloud Function via Hosting; em dev apontamos
// para o site publicado para conseguir abrir um jogo de ponta a ponta.
const GAMES_TARGET =
  process.env.DEV_PROXY_GAMES_TARGET || 'https://adapt2learn-api.web.app'

module.exports = function setupProxy(app) {
  app.use(
    '/api',
    createProxyMiddleware({
      target: API_TARGET,
      changeOrigin: true,
      logLevel: 'warn',
      onError(err, req, res) {
        console.error(`[proxy] ${req.method} ${req.url} → ${err.message}`)
        if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ detail: `Proxy falhou: ${err.message}` }))
      },
    })
  )

  app.use(
    '/games',
    createProxyMiddleware({
      target: GAMES_TARGET,
      changeOrigin: true,
      logLevel: 'warn',
    })
  )
}
