import {
  buildContentCatalog,
  filterAllowedSubareas,
  hasSubareaRestriction,
} from './contentOptions'

const docs = [
  { discipline: 'Matemática', subarea: 'Geometria Plana' },
  { discipline: 'Matemática', subarea: 'Matematica Financeira' },
  { discipline: 'Matemática', subarea: '2º ano EM - Educação Financeira' },
  { discipline: 'Matemática', subarea: '2_ano_MP' },
]

describe('restrição de subárea por escola (estudo Messias Pedreiro)', () => {
  const catalog = buildContentCatalog(docs, [])
  const subareas = catalog.getSubareas('Matemática')

  test('Messias Pedreiro só vê Geometria Plana', () => {
    expect(filterAllowedSubareas('Messias Pedreiro', subareas)).toEqual([
      'Geometria Plana',
    ])
  })

  test('comparação ignora caixa e espaços no school_id', () => {
    expect(filterAllowedSubareas('  messias pedreiro ', subareas)).toEqual([
      'Geometria Plana',
    ])
  })

  test('escolas sem restrição recebem a lista completa', () => {
    expect(filterAllowedSubareas('Eseba', subareas)).toEqual(subareas)
    expect(filterAllowedSubareas(undefined, subareas)).toEqual(subareas)
  })

  test('hasSubareaRestriction reflete a allowlist', () => {
    expect(hasSubareaRestriction('Messias Pedreiro')).toBe(true)
    expect(hasSubareaRestriction('Eseba')).toBe(false)
    expect(hasSubareaRestriction(undefined)).toBe(false)
  })
})
