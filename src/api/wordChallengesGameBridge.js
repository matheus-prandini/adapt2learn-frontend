/**
 * Helpers para jogos (iframe) consumirem Word Challenges em runtime.
 * Parâmetros vêm da query string ao iniciar o jogo (school_id, discipline, subarea, session_number).
 */
import {
  fetchNextWordChallenge,
  submitWordChallengeResponse,
} from './wordChallengesApi'

/**
 * @param {URLSearchParams | string} search
 */
export function parseWordChallengeGameParams(search) {
  const params =
    typeof search === 'string' ? new URLSearchParams(search) : search

  return {
    school_id: params.get('school_id') || '',
    discipline: params.get('discipline') || '',
    subarea: params.get('subarea') || '',
    session_number: Number(params.get('session_number') || 0) || undefined,
  }
}

/**
 * Busca o próximo desafio para exibir no jogo.
 * @param {import('../types/wordChallenges').FetchNextWordChallengeParams} filters
 */
export async function loadNextChallengeForGame(filters) {
  return fetchNextWordChallenge(filters)
}

/**
 * Registra resposta ao fim da rodada.
 * @param {object} opts
 * @param {string} opts.challenge_id
 * @param {number} [opts.game_session_number]
 * @param {boolean} [opts.correct]
 */
export async function recordChallengeResponse(opts) {
  return submitWordChallengeResponse({
    challenge_id: opts.challenge_id,
    game_session_number: opts.game_session_number,
    correct: opts.correct,
  })
}
