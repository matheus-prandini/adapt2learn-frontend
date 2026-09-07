import { apiFetch, jsonBody } from './httpClient'

/**
 * Registra um evento de plataforma (login, cadastro, início de jogo…).
 *
 * É best-effort por design: analytics nunca pode quebrar nem atrasar o fluxo
 * do aluno. Falhas viram um `console.warn`, a Promise sempre resolve e os
 * chamadores NÃO devem aguardá-la antes de navegar (`keepalive` garante o envio).
 *
 * @param {string} eventType   ex.: 'login_success', 'game_start'
 * @param {object} [payload]   dados livres do evento
 * @param {object} [extra]     campos de topo aceitos pelo backend (ex.: game_id)
 */
export async function logPlatformEvent(eventType, payload = {}, extra = {}) {
  try {
    await apiFetch('/events/platform', {
      method: 'POST',
      // Sobrevive ao unload da página — chamadores não precisam esperar por isto.
      keepalive: true,
      ...jsonBody({ event_type: eventType, payload, ...extra }),
    })
  } catch (err) {
    console.warn(`[events] não foi possível registrar "${eventType}":`, err?.message || err)
  }
}
