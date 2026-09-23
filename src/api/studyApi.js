import { apiFetch, ApiError } from './httpClient'

/**
 * Plano de controle do estudo adaptativo (I-GPLATO / Associação 21).
 *
 * É a camada que fala com `/api/study/*`. Vale a pena saber duas coisas sobre
 * ela antes de mexer:
 *
 * 1. **As regras do experimento moram no backend, não aqui.** Esta tela pode
 *    esconder um botão, mas quem recusa uma ativação fora de hora, sem
 *    confirmação, ou no domínio de controle de alguém é a API. Se um caminho
 *    desta tela sumir, nada se afrouxa.
 * 2. **O erro é estruturado.** O backend devolve `detail` como objeto nos 409
 *    (`planned_date`/`effective_date` quando é calendário, `offending_uids`
 *    quando é domínio de controle). `parseJsonOrThrow`, do httpClient comum,
 *    interpola esse objeto na mensagem e produz "[object Object]" — por isso
 *    aqui existe um parser próprio, que preserva o objeto em `err.detail` e
 *    deixa o diálogo mostrar qual é a divergência.
 */

/** Códigos que o diálogo de ativação trata de forma específica. */
export const STUDY_ERROR = {
  /** 428: falta a frase de confirmação (ou está diferente). */
  NEEDS_CONFIRMATION: 428,
  /** 409: data fora do calendário, ou domínio de controle. */
  CONFLICT: 409,
}

async function studyJson(path, options) {
  const res = await apiFetch(path, options)
  if (res.ok) {
    const text = await res.text()
    return text ? JSON.parse(text) : null
  }

  let detail = ''
  try {
    detail = (await res.json())?.detail ?? ''
  } catch {
    /* corpo não é JSON — segue só com o status */
  }
  const mensagem =
    (typeof detail === 'string' && detail) || detail?.detail || `Erro inesperado (${res.status}).`
  throw new ApiError(mensagem, { status: res.status, detail })
}

/** Roster com o estado por domínio de cada participante, mais a config. */
export function getParticipants() {
  return studyJson('/study/participants')
}

/**
 * Cadastro do participante: onda, domínio tratado, slot, monitor, ativo.
 * NÃO liga a adaptação — isso é `activate`, com confirmação digitada.
 */
export function updateParticipant(uid, fields) {
  return studyJson(`/study/participants/${encodeURIComponent(uid)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

function armChange(rota, corpo) {
  return studyJson(rota, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

/**
 * Liga a adaptação de `(onda, domínio)`.
 *
 * Com `dry_run: true` devolve o preview — quantos participantes mudam, quantos
 * já estão ativos, a data planejada e a frase esperada — **sem** exigir a
 * confirmação que o operador ainda não digitou. É o preview que alimenta o
 * diálogo.
 */
export function activateWave(corpo) {
  return armChange('/study/activate', corpo)
}

/** Desliga a adaptação. Ação separada, com frase de confirmação própria. */
export function deactivateWave(corpo) {
  return armChange('/study/deactivate', corpo)
}

/** Trilha de auditoria, mais recente primeiro. */
export function getAudit(limit = 100) {
  return studyJson(`/study/audit?limit=${limit}`)
}

/** Config do estudo (fase, domínios, parâmetros do mecanismo adaptativo). */
export function getStudyConfig() {
  return studyJson('/study/config')
}

export function updateStudyConfig(fields) {
  return studyJson('/study/config', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(fields),
  })
}

/**
 * Dispara o pré-cálculo do `W` da onda. **Demora minutos** — a chamada é
 * síncrona no backend de propósito (ver `POST /study/precompute`), então quem
 * chama precisa manter o estado de carregamento por todo esse tempo.
 */
export function precomputeWeights(corpo) {
  return studyJson('/study/precompute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

/** Relatório de curadoria do banco: itens por banda e rejeitados com motivo. */
export function getBankHealth({ domain, school_id, discipline, subarea }) {
  const qs = new URLSearchParams({ domain, school_id, discipline, subarea })
  return studyJson(`/study/bank-health?${qs}`)
}

/**
 * Propõe ou aplica a alocação de onda e domínio tratado (§2 do protocolo).
 *
 * `dry_run: true` devolve a proposta, o equilíbrio realizado e a **semente**. A
 * semente tem de voltar no apply: sem ela a alocação gravada seria outra que a
 * mostrada na tela, e a reprodutibilidade que o artigo afirma deixaria de
 * existir.
 */
export function allocateStudy(corpo) {
  return studyJson('/study/allocate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corpo),
  })
}

/** Banco de palavras item a item, com banda, sondagem e posição na régua. */
export function getWordBank({ school_id, discipline, subarea }) {
  const qs = new URLSearchParams({ school_id, discipline, subarea })
  return studyJson(`/study/word-bank?${qs}`)
}

/**
 * Marca ou desmarca um item como sondagem. **Muda a régua do estudo** — a
 * chamada vai para a trilha de auditoria do lado do backend.
 */
export function setProbe(challengeId, probe) {
  return studyJson(`/study/word-bank/${encodeURIComponent(challengeId)}/probe`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ probe }),
  })
}
