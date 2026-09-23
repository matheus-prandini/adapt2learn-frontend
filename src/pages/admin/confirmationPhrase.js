/**
 * Conferência da frase de confirmação da ativação/desativação de uma onda.
 *
 * Mora num módulo próprio, e não dentro do diálogo, por um motivo: é a única
 * lógica daquela tela que, se afrouxar, deixa passar uma ação que corrompe o
 * desenho do estudo. Separada, dá para testá-la sem DOM — e o repositório não
 * precisa ganhar uma biblioteca de teste de componente só para isso.
 *
 * O backend faz a mesma conferência, e é ele quem recusa de fato (428). Esta
 * existe para o botão só habilitar quando a frase já confere, em vez de o
 * operador descobrir pelo erro.
 */

/**
 * A frase confere? Caixa e espaço sobrando são ignorados; o texto, não.
 *
 * O propósito da confirmação digitada é **deliberação**, não ortografia: exigir
 * caixa exata só produz operador irritado repetindo a frase na hora errada — e
 * "na hora errada" aqui é o dia da entrada em intervenção, com as crianças
 * esperando. Mesma regra de `_confirmation_matches` no backend; as duas têm de
 * continuar iguais, senão o botão habilita e a API recusa.
 *
 * @param {string} typed - o que o operador digitou
 * @param {string} expected - a frase que a API espera (vem do dry-run)
 * @returns {boolean}
 */
export function matchesConfirmation(typed, expected) {
  if (!typed || !expected) return false
  return normalize(typed) === normalize(expected)
}

function normalize(s) {
  return String(s).trim().replace(/\s+/g, ' ').toUpperCase()
}
