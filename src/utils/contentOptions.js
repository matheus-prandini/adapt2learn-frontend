/**
 * Combina disciplinas/subáreas de documentos (escola) e word-challenges (por jogo).
 * @param {Array<{ discipline?: string, subarea?: string }>} docs
 * @param {Array<{ discipline?: string, subarea?: string }>} wordChallengeItems
 */
export function buildDisciplineOptions(docs, wordChallengeItems) {
  const set = new Set()
  for (const d of docs) {
    if (d.discipline?.trim()) set.add(d.discipline.trim())
  }
  for (const c of wordChallengeItems) {
    if (c.discipline?.trim()) set.add(c.discipline.trim())
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/**
 * @param {string} discipline
 * @param {Array<{ discipline?: string, subarea?: string }>} docs
 * @param {Array<{ discipline?: string, subarea?: string }>} wordChallengeItems
 */
export function buildSubareaOptions(discipline, docs, wordChallengeItems) {
  if (!discipline) return []
  const set = new Set()
  for (const d of docs) {
    if (d.discipline === discipline && d.subarea?.trim()) {
      set.add(d.subarea.trim())
    }
  }
  for (const c of wordChallengeItems) {
    if (c.discipline === discipline && c.subarea?.trim()) {
      set.add(c.subarea.trim())
    }
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'))
}
