/**
 * Normaliza respostas da API de word-challenges para evitar crash de render no React.
 */

const SOURCE_LABELS = {
  manual: 'Manual',
  ai: 'Gerado por IA',
}

const DIFFICULTY_LABELS = {
  easy: 'Fácil',
  medium: 'Média',
  hard: 'Difícil',
}

const APPROVAL_LABELS = {
  auto: 'Aprovado (auto)',
  pending: 'Pendente',
  rejected: 'Rejeitado',
  approved: 'Aprovado',
}

/**
 * @param {unknown} value
 * @returns {{ summary: string | null, badges: { key: string, text: string }[] }}
 */
export function parsePedagogicalMeta(value) {
  if (value == null || value === '') {
    return { summary: null, badges: [] }
  }

  if (typeof value === 'string') {
    return { summary: value, badges: [] }
  }

  if (typeof value !== 'object') {
    return { summary: String(value), badges: [] }
  }

  const meta = /** @type {Record<string, string>} */ (value)
  const badges = []

  if (meta.source) {
    badges.push({
      key: 'source',
      text: SOURCE_LABELS[meta.source] || meta.source,
    })
  }

  if (meta.difficulty) {
    badges.push({
      key: 'difficulty',
      text: DIFFICULTY_LABELS[meta.difficulty] || meta.difficulty,
    })
  }

  if (meta.approval_status) {
    badges.push({
      key: 'approval_status',
      text: APPROVAL_LABELS[meta.approval_status] || meta.approval_status,
    })
  }

  if (meta.pipeline_version) {
    badges.push({
      key: 'pipeline_version',
      text: meta.pipeline_version,
    })
  }

  const summary = badges.length > 0 ? badges.map(b => b.text).join(' · ') : null

  return { summary, badges }
}

/** @deprecated use parsePedagogicalMeta */
export function formatPedagogicalForDisplay(value) {
  return parsePedagogicalMeta(value).summary
}

/**
 * @param {unknown} item
 */
export function normalizeWordChallengeItem(item) {
  if (!item || typeof item !== 'object') {
    return {
      id: '',
      word: '',
      image_url: '',
      word_slug: '',
      pedagogical_summary: null,
      pedagogical_badges: [],
      created_at: null,
    }
  }

  const raw = /** @type {Record<string, unknown>} */ (item)
  const pedagogical = parsePedagogicalMeta(raw.pedagogical)

  return {
    id: String(raw.id ?? raw._id ?? ''),
    word: String(raw.word ?? ''),
    image_url: String(raw.image_url ?? raw.imageUrl ?? ''),
    word_slug: typeof raw.word_slug === 'string' ? raw.word_slug : '',
    school_id: typeof raw.school_id === 'string' ? raw.school_id : undefined,
    game_id: typeof raw.game_id === 'string' ? raw.game_id : undefined,
    discipline: typeof raw.discipline === 'string' ? raw.discipline : undefined,
    subarea: typeof raw.subarea === 'string' ? raw.subarea : undefined,
    storage_path: typeof raw.storage_path === 'string' ? raw.storage_path : undefined,
    pedagogical_summary: pedagogical.summary,
    pedagogical_badges: pedagogical.badges,
    created_at: raw.created_at ?? raw.createdAt ?? null,
  }
}

/**
 * @param {unknown} data
 * @returns {ReturnType<typeof normalizeWordChallengeItem>[]}
 */
export function normalizeWordChallengeList(data) {
  if (Array.isArray(data)) {
    return data.map(normalizeWordChallengeItem)
  }

  if (data && typeof data === 'object') {
    const obj = /** @type {Record<string, unknown>} */ (data)
    for (const key of ['items', 'challenges', 'results', 'data']) {
      if (Array.isArray(obj[key])) {
        return obj[key].map(normalizeWordChallengeItem)
      }
    }
  }

  return []
}

/**
 * @param {ReturnType<typeof normalizeWordChallengeItem>[]} items
 */
export function sortWordChallengesByDateDesc(items) {
  if (!Array.isArray(items)) return []

  return [...items].sort((a, b) => {
    const ta = a.created_at ? new Date(a.created_at).getTime() : 0
    const tb = b.created_at ? new Date(b.created_at).getTime() : 0
    const safeA = Number.isFinite(ta) ? ta : 0
    const safeB = Number.isFinite(tb) ? tb : 0
    return safeB - safeA
  })
}
