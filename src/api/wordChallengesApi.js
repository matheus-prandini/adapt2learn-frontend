import { apiFetch, parseJsonOrThrow } from './httpClient'
import { normalizeWordChallengeList } from './wordChallengeNormalize'

/**
 * @param {import('../types/wordChallenges').ListWordChallengesParams} params
 * @returns {Promise<import('../types/wordChallenges').WordChallengeListItem[]>}
 */
export async function listWordChallenges(params) {
  const qs = new URLSearchParams({ school_id: params.school_id })
  if (params.discipline) qs.set('discipline', params.discipline)
  if (params.subarea) qs.set('subarea', params.subarea)

  const res = await apiFetch(`/word-challenges/list?${qs}`)
  const data = await parseJsonOrThrow(res, 'Não foi possível carregar os desafios.')
  return normalizeWordChallengeList(data)
}

/**
 * Lista desafios da escola (discipline/subarea opcionais no backend).
 * @param {string} schoolId
 */
export async function listWordChallengesForSchool(schoolId) {
  if (!schoolId) return []

  const qs = new URLSearchParams({ school_id: schoolId })
  const res = await apiFetch(`/word-challenges/list?${qs}`)
  if (res.status === 404) return []

  const data = await parseJsonOrThrow(
    res,
    'Não foi possível carregar opções de desafios.'
  )
  return normalizeWordChallengeList(data)
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
