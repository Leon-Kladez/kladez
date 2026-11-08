import type { serverSystemServiceEn } from '../en/serverSystemService.js'

export const serverSystemServiceRu: Record<keyof typeof serverSystemServiceEn, string> = {
  'server.systemService.updatesNotPublished': 'Новые версии пока выходят без проверки через интернет: адрес для неё появится, когда Кладезъ выйдет в открытый доступ.',
  'server.systemService.failedToCheckLatestVersion': 'Не удалось проверить новую версию: {error}',
  'server.systemService.successfullySubscribedToReleaseNotes': 'Вы подписались на новости о версиях',
  'server.systemService.failedToSubscribe': 'Не удалось подписаться: {statusText}',
  'server.systemService.failedToSubscribe2': 'Не удалось подписаться: {error}',
}
