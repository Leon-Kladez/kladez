import type { serverSystemServiceEn } from '../en/serverSystemService.js'

export const serverSystemServiceRu: Record<keyof typeof serverSystemServiceEn, string> = {
  'server.systemService.failedToCheckLatestVersion': 'Не удалось проверить новую версию: {error}',
  'server.systemService.successfullySubscribedToReleaseNotes': 'Вы подписались на новости о версиях',
  'server.systemService.failedToSubscribe': 'Не удалось подписаться: {statusText}',
  'server.systemService.failedToSubscribe2': 'Не удалось подписаться: {error}',
}
