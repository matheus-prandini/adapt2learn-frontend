export interface WordChallengePedagogical {
  approval_status?: 'auto' | 'pending' | 'rejected' | 'approved' | string
  difficulty?: 'easy' | 'medium' | 'hard' | string
  pipeline_version?: string
  source?: 'manual' | 'ai' | string
}

export interface WordChallengeListItem {
  id: string
  word: string
  image_url: string
  word_slug?: string
  school_id?: string
  game_id?: string
  discipline?: string
  subarea?: string
  storage_path?: string
  /** Texto legível derivado de pedagogical (metadados) */
  pedagogical_summary?: string | null
  pedagogical_badges?: { key: string; text: string }[]
  created_at?: string | null
}

/** Resposta bruta da API antes da normalização */
export interface WordChallengeListItemRaw {
  id: string
  word: string
  image_url: string
  word_slug?: string
  school_id?: string
  game_id?: string
  discipline?: string
  subarea?: string
  storage_path?: string
  pedagogical?: WordChallengePedagogical | string | null
  created_at?: string
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
