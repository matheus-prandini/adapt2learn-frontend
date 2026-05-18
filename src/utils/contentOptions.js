/**
 * Catálogo de disciplinas/subáreas a partir de documentos e word-challenges.
 */

/**
 * @param {string} [value]
 */
export function normalizeContentKey(value) {
  if (!value || typeof value !== 'string') return ''
  return value.trim().normalize('NFC').toLocaleLowerCase('pt-BR')
}

/**
 * @param {Array<{ discipline?: string, subarea?: string }>} docs
 * @param {Array<{ discipline?: string, subarea?: string }>} wordChallengeItems
 */
export function buildContentCatalog(docs = [], wordChallengeItems = []) {
  /** @type {Map<string, { discipline: string, subareas: Map<string, string> }>} */
  const byDisciplineKey = new Map()

  const ingest = (discipline, subarea) => {
    const d = discipline?.trim()
    if (!d) return

    const disciplineKey = normalizeContentKey(d)
    if (!byDisciplineKey.has(disciplineKey)) {
      byDisciplineKey.set(disciplineKey, { discipline: d, subareas: new Map() })
    }

    const s = subarea?.trim()
    if (!s) return

    const entry = byDisciplineKey.get(disciplineKey)
    const subareaKey = normalizeContentKey(s)
    if (!entry.subareas.has(subareaKey)) {
      entry.subareas.set(subareaKey, s)
    }
  }

  for (const doc of docs) ingest(doc.discipline, doc.subarea)
  for (const item of wordChallengeItems) ingest(item.discipline, item.subarea)

  const disciplines = Array.from(byDisciplineKey.values())
    .map(entry => entry.discipline)
    .sort((a, b) => a.localeCompare(b, 'pt-BR'))

  return {
    disciplines,
    /**
     * @param {string} discipline
     */
    getSubareas(discipline) {
      const key = normalizeContentKey(discipline)
      const entry = byDisciplineKey.get(key)
      if (!entry) return []
      return Array.from(entry.subareas.values()).sort((a, b) =>
        a.localeCompare(b, 'pt-BR')
      )
    },
  }
}

/**
 * @param {Array<{ discipline?: string, subarea?: string }>} docs
 * @param {Array<{ discipline?: string, subarea?: string }>} wordChallengeItems
 */
export function buildDisciplineOptions(docs, wordChallengeItems) {
  return buildContentCatalog(docs, wordChallengeItems).disciplines
}

/**
 * @param {string} discipline
 * @param {Array<{ discipline?: string, subarea?: string }>} docs
 * @param {Array<{ discipline?: string, subarea?: string }>} wordChallengeItems
 */
export function buildSubareaOptions(discipline, docs, wordChallengeItems) {
  if (!discipline?.trim()) return []
  return buildContentCatalog(docs, wordChallengeItems).getSubareas(discipline)
}

/**
 * @param {{ id?: string, game_id?: string }} game
 */
export function getGameId(game) {
  return game?.id || game?.game_id || ''
}
