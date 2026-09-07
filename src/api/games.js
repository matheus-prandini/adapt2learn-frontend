import { getDownloadURL, ref } from 'firebase/storage'
import { storage } from '../firebase'
import { apiJson } from './httpClient'

export function listGames() {
  return apiJson('/games', undefined, 'Falha ao carregar jogos.')
}

/**
 * Jogos com a URL pública do ícone resolvida no Storage. Um ícone ausente ou
 * sem permissão vira string vazia — nunca pode derrubar a lista inteira (antes
 * o GameSelect fazia isso e escondia todos os jogos do aluno).
 */
export async function listGamesWithIcons() {
  const games = await listGames()
  return Promise.all(
    games.map(async g => {
      let iconUrl = ''
      if (g.icon_url) {
        try {
          iconUrl = await getDownloadURL(ref(storage, g.icon_url))
        } catch {
          /* sem ícone */
        }
      }
      return { ...g, iconUrl }
    })
  )
}
