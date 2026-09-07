import { apiJson } from './httpClient'

/**
 * Perfil do usuário autenticado no backend (`/me`).
 * Lança ApiError com status 404 quando a conta Firebase existe mas não está
 * cadastrada na plataforma — o login usa isso para orientar ao cadastro.
 */
export function fetchProfile() {
  return apiJson('/me', undefined, 'Não foi possível carregar seu perfil.')
}
