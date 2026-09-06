// URL absoluta do Cloud Run. Em produção o app fala com o backend por este
// endereço (o Firebase Hosting também reescreve /api/**, mas mantemos o
// comportamento que já estava em uso).
export const API_ORIGIN = 'https://adapt2learn-895112363610.us-central1.run.app'

const isDev = import.meta.env.DEV

/**
 * Base de todas as chamadas de API.
 *
 * Em desenvolvimento usamos o caminho relativo `/api`, que o proxy do dev
 * server (src/setupProxy.js) encaminha para o Cloud Run — chamar o backend
 * direto do browser em localhost é barrado por CORS.
 *
 * Dá para apontar para outro backend (ex.: uma API local) definindo
 * VITE_API_BASE_URL em um arquivo .env.local.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (isDev ? '/api' : `${API_ORIGIN}/api`)
