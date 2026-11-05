import type { serverContentAutoUpdateServiceEn } from '../en/serverContentAutoUpdateService.js'

export const serverContentAutoUpdateServiceRu: Record<keyof typeof serverContentAutoUpdateServiceEn, string> = {
  'server.contentAutoUpdateService.upToDate': 'Новейшая версия',
  'server.contentAutoUpdateService.autoUpdateDisabledAfterRepeated': 'Автообновление выключено после нескольких неудач',
  'server.contentAutoUpdateService.coolOffPending': 'Ждёт выдержки',
  'server.contentAutoUpdateService.inCoolOffHRemaining': 'Выдержка (осталось {rounded} ч)',
  'server.contentAutoUpdateService.eligible': 'Можно обновить → {available_update_version}',
  'server.contentAutoUpdateService.downloadSInProgress': 'Идут скачивания: {length}',
  'server.contentAutoUpdateService.contentAutoUpdateIsDisabled': 'Автообновление материалов выключено',
  'server.contentAutoUpdateService.failed': 'Ошибка: {error}',
  'server.contentAutoUpdateService.outsideUpdateWindow': 'Сейчас не время для обновлений ({windowStart}–{windowEnd})',
  'server.contentAutoUpdateService.drugDataset': 'данные о лекарствах: {reason}',
  'server.contentAutoUpdateService.drugDatasetCheckFailed': 'не удалось проверить данные о лекарствах: {error}',
  'server.contentAutoUpdateService.exceedsDataCapUpdateManually': 'Больше ограничения — обновите вручную',
  'server.contentAutoUpdateService.contentAutoUpdateDisabledAfter': 'Автообновление материалов выключено после {failures} неудачных попыток подряд. Последняя ошибка: {reason}',
}
