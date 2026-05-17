export interface WordChallengeListItem {
  id: string
  word: string
  image_url: string
  pedagogical?: string
  created_at: string
  discipline?: string
  subarea?: string
  school_id?: string
  game_id?: string
}

export interface WordChallengePlayItem {
  id: string
  word: string
  image_url: string
}

export interface CreateWordChallengesManualBody {
  school_id: string
  game_id: string
  discipline: string
  subarea: string
  words: string[]
}

export interface CreateWordChallengesAiBody {
  school_id: string
  game_id: string
  discipline: string
  subarea: string
  count: number
  topic?: string
  grade_level?: string
}

export type CreateWordChallengesBody =
  | CreateWordChallengesManualBody
  | CreateWordChallengesAiBody

export interface SubmitWordChallengeResponseBody {
  challenge_id: string
  game_id: string
  game_session_number?: number
  correct?: boolean
}

export interface ListWordChallengesParams {
  school_id: string
  game_id: string
  discipline: string
  subarea: string
}

export interface FetchNextWordChallengeParams extends ListWordChallengesParams {}
