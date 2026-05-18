import { apiFetch, parseJsonOrThrow } from './httpClient'
import { normalizeWordChallengeList } from './wordChallengeNormalize'

/**
 * @param {import('../types/wordChallenges').ListWordChallengesParams} params
 * @returns {Promise<import('../types/wordChallenges').WordChallengeListItem[]>}
 */
export async function listWordChallenges(params) {
  const qs = new URLSearchParams({
    school_id: params.school_id,
    game_id: params.game_id,
    discipline: params.discipline,
    subarea: params.subarea,
  })
  const res = await apiFetch(`/word-challenges/list?${qs}`)
  const data = await parseJsonOrThrow(res, 'Não foi possível carregar os desafios.')
  return normalizeWordChallengeList(data)
}

/**
 * Lista desafios do jogo (sem filtrar disciplina/subárea) para montar opções no GameSelect.
 * @param {string} schoolId
 * @param {string} gameId
 * @returns {Promise<import('../types/wordChallenges').WordChallengeListItem[]>}
 */
export async function listWordChallengesForGame(schoolId, gameId) {
  if (!schoolId || !gameId) return []

  const qs = new URLSearchParams({ school_id: schoolId, game_id: gameId })
  const res = await apiFetch(`/word-challenges/list?${qs}`)

  if (res.status === 404) return []

  if (!res.ok) {
    console.warn(
      `word-challenges/list (jogo) retornou ${res.status}`,
      await res.text().catch(() => '')
    )
    return []
  }

  const data = await res.json().catch(() => null)
  return normalizeWordChallengeList(data)
}

/**
 * Extrai pares únicos disciplina/subárea de itens de word-challenges.
 * @param {import('../types/wordChallenges').WordChallengeListItem[]} items
 */
export function disciplineSubareaPairsFromChallenges(items) {
  const seen = new Set()
  const pairs = []
  for (const item of items) {
    const discipline = item.discipline?.trim()
    const subarea = item.subarea?.trim()
    if (!discipline || !subarea) continue
    const key = `${discipline}\0${subarea}`
    if (seen.has(key)) continue
    seen.add(key)
    pairs.push({ discipline, subarea })
  }
  return pairs
}

/**
 * @param {import('../types/wordChallenges').CreateWordChallengesBody} body
 */
export async function createWordChallenges(body) {
  const res = await apiFetch('/word-challenges', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (res.status === 202) return res.json().catch(() => ({}))
  await parseJsonOrThrow(res, 'Não foi possível criar os desafios.')
}

/**
 * @param {import('../types/wordChallenges').ListWordChallengesParams} params
 * @param {{ intervalMs?: number, timeoutMs?: number, minCount?: number }} [opts]
 */
export async function pollWordChallengesList(params, opts = {}) {
  const intervalMs = opts.intervalMs ?? 4000
  const timeoutMs = opts.timeoutMs ?? 150000
  const minCount = opts.minCount ?? 0
  const started = Date.now()
  let last = []

  while (Date.now() - started < timeoutMs) {
    last = await listWordChallenges(params)
    if (last.length >= minCount && last.length > 0) return last
    await new Promise(r => setTimeout(r, intervalMs))
  }

  return last
}

/**
 * @param {import('../types/wordChallenges').FetchNextWordChallengeParams} params
 * @returns {Promise<import('../types/wordChallenges').WordChallengePlayItem | null>}
 */
export async function fetchNextWordChallenge(params) {
  const qs = new URLSearchParams({
    school_id: params.school_id,
    game_id: params.game_id,
    discipline: params.discipline,
    subarea: params.subarea,
  })
  const res = await apiFetch(`/word-challenges?${qs}`)
  if (res.status === 404) return null
  return parseJsonOrThrow(res, 'Não foi possível carregar o desafio.')
}

/**
 * @param {import('../types/wordChallenges').SubmitWordChallengeResponseBody} body
 */
export async function submitWordChallengeResponse(body) {
  const res = await apiFetch('/word-challenges/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  await parseJsonOrThrow(res, 'Não foi possível registrar a resposta.')
}
