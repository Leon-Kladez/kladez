import type { serverChatsControllerEn } from '../en/serverChatsController.js'

export const serverChatsControllerRu: Record<keyof typeof serverChatsControllerEn, string> = {
  'server.chatsController.aiAssistantServiceNotInstalled': 'ИИ-помощник не установлен',
  'server.chatsController.sessionNotFound': 'Разговор не найден',
  'server.chatsController.failedToCreateSession': 'Не удалось начать разговор',
  'server.chatsController.failedToGetSuggestions': 'Не удалось получить подсказки',
  'server.chatsController.failedToUpdateSession': 'Не удалось изменить разговор',
  'server.chatsController.failedToDeleteSession': 'Не удалось удалить разговор',
  'server.chatsController.failedToAddMessage': 'Не удалось добавить сообщение',
  'server.chatsController.failedToDeleteAllSessions': 'Не удалось удалить разговоры',
}
