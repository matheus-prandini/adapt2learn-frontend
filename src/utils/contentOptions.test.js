import {
  buildContentCatalog,
  filterAllowedSubareas,
  hasSubareaRestriction,
  normalizeContentKey,
} from './contentOptions'

const docs = [
  { discipline: 'Matemática', subarea: 'Geometria Plana' },
  { discipline: 'Matemática', subarea: 'Matematica Financeira' },
  { discipline: 'Matemática', subarea: '2º ano EM - Educação Financeira' },
  { discipline: 'Matemática', subarea: '2_ano_MP' },
]

describe('restrição de subárea por escola (allowlist vazia)', () => {
  const catalog = buildContentCatalog(docs, [])
  const subareas = catalog.getSubareas('Matemática')

  test('nenhuma escola está restrita — todas veem a lista completa', () => {
    expect(filterAllowedSubareas('Messias Pedreiro', subareas)).toEqual(subareas)
    expect(filterAllowedSubareas('Eseba', subareas)).toEqual(subareas)
    expect(filterAllowedSubareas(undefined, subareas)).toEqual(subareas)
  })

  test('hasSubareaRestriction reflete a allowlist', () => {
    expect(hasSubareaRestriction('Messias Pedreiro')).toBe(false)
    expect(hasSubareaRestriction('Eseba')).toBe(false)
    expect(hasSubareaRestriction(undefined)).toBe(false)
  })

  // A comparação por chave normalizada é o que fará a allowlist voltar a
  // casar com o school_id quando alguma escola for travada de novo.
  test('normalizeContentKey ignora caixa, espaços e acentos na comparação', () => {
    expect(normalizeContentKey('  Messias Pedreiro ')).toBe('messias pedreiro')
    expect(normalizeContentKey('Geometria Plana')).toBe('geometria plana')
    expect(normalizeContentKey(undefined)).toBe('')
  })
})
