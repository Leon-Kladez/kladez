import type { serverSystemUpdateServiceEn } from '../en/serverSystemUpdateService.js'

export const serverSystemUpdateServiceRu: Record<keyof typeof serverSystemUpdateServiceEn, string> = {
  'server.systemUpdateService.updateAlreadyInProgressStage': 'Обновление уже идёт (этап: {stage})',
  'server.systemUpdateService.systemUpdateInitiatedTheAdmin': 'Обновление началось. Основной контейнер перезапустится.',
  'server.systemUpdateService.failedToRequestSystemUpdate': 'Не удалось начать обновление. Подробности — в журнале сервера.',
  'server.systemUpdateService.noUpdateInProgress': 'Обновление не идёт',
}
