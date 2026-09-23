import { describe, expect, it } from 'vitest'
import { matchesConfirmation } from './confirmationPhrase'

const ESPERADA = 'ATIVAR ONDA 1 LEITURA'

describe('matchesConfirmation', () => {
  it('aceita a frase exata', () => {
    expect(matchesConfirmation(ESPERADA, ESPERADA)).toBe(true)
  })

  it('ignora caixa e espaço sobrando — o propósito é deliberação, não ortografia', () => {
    expect(matchesConfirmation('  ativar   onda 1   Leitura ', ESPERADA)).toBe(true)
  })

  it('recusa frase parecida mas diferente', () => {
    expect(matchesConfirmation('ATIVAR ONDA 2 LEITURA', ESPERADA)).toBe(false)
    expect(matchesConfirmation('ATIVAR ONDA 1 NUMERACIA', ESPERADA)).toBe(false)
    expect(matchesConfirmation('ATIVAR', ESPERADA)).toBe(false)
  })

  it('recusa a frase de ATIVAR quando a ação é DESATIVAR', () => {
    // Desativar é ação separada, com frase própria: é o que impede o mesmo
    // gesto de ligar e desligar por engano.
    expect(matchesConfirmation(ESPERADA, 'DESATIVAR ONDA 1 LEITURA')).toBe(false)
  })

  it('recusa vazio dos dois lados', () => {
    expect(matchesConfirmation('', ESPERADA)).toBe(false)
    expect(matchesConfirmation(ESPERADA, '')).toBe(false)
    expect(matchesConfirmation(undefined, undefined)).toBe(false)
  })
})
