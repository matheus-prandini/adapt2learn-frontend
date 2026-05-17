import { auth } from '../firebase'
import { API_BASE_URL } from './config'

const ERROR_MESSAGES = {
  401: 'Sessão expirada. Faça login novamente.',
  403: 'Você não tem permissão para esta ação.',
  404: 'Conteúdo não encontrado.',
  502: 'Serviço temporariamente indisponível. Tente novamente em instantes.',
}

export function mapApiError(status, fallback) {
  return ERROR_MESSAGES[status] || fallback || `Erro inesperado (${status}).`
}

async function getToken() {
  const user = auth.currentUser
  if (!user) throw new Error('Usuário não autenticado.')
  return user.getIdToken()
}

/**
 * @param {string} path - path relativo (ex: /word-challenges)
 * @param {RequestInit} [options]
 * @returns {Promise<Response>}
 */
export async function apiFetch(path, options = {}) {
  const token = await getToken()
  const headers = new Headers(options.headers || {})
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`)
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers })
}

/**
 * @param {Response} res
 * @param {string} [fallback]
 */
export async function parseJsonOrThrow(res, fallback) {
  if (res.ok) {
    if (res.status === 204) return null
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }
  let detail = ''
  try {
    const body = await res.json()
    detail = body?.detail || body?.message || ''
  } catch {
    /* ignore */
  }
  const msg = mapApiError(res.status, fallback)
  throw new Error(detail ? `${msg} ${detail}` : msg)
}
