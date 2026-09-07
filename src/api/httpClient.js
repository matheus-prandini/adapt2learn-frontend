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

/**
 * Erro de API com o status HTTP preservado — permite a quem chama distinguir
 * "não cadastrado" (404) de "backend fora" (5xx) sem inspecionar a mensagem.
 */
export class ApiError extends Error {
  constructor(message, { status, detail } = {}) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

async function getToken() {
  const user = auth.currentUser
  if (!user) throw new ApiError('Usuário não autenticado.', { status: 401 })
  return user.getIdToken()
}

/**
 * fetch autenticado contra a API. Devolve a Response crua; use `apiJson`
 * quando quiser o corpo já parseado e erros HTTP convertidos em exceção.
 *
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
  // Corpo JSON sem Content-Type é um erro fácil de cometer; FormData fica intacto.
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  return fetch(`${API_BASE_URL}${path}`, { ...options, headers })
}

/**
 * @param {Response} res
 * @param {string} [fallback] - mensagem para status sem tradução específica
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
    /* corpo não é JSON — segue só com o status */
  }
  const msg = mapApiError(res.status, fallback)
  throw new ApiError(detail ? `${msg} ${detail}` : msg, { status: res.status, detail })
}

/**
 * Atalho para o caso comum: chama e já parseia, lançando ApiError em !ok.
 *
 * @template T
 * @param {string} path
 * @param {RequestInit} [options]
 * @param {string} [fallback]
 * @returns {Promise<T>}
 */
export async function apiJson(path, options, fallback) {
  const res = await apiFetch(path, options)
  return parseJsonOrThrow(res, fallback)
}

/** Serializa um objeto para o corpo de uma requisição JSON. */
export function jsonBody(data) {
  return { body: JSON.stringify(data) }
}
