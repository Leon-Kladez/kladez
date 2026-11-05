import type { serviceLogsEn } from '../en/serviceLogs.js'

export const serviceLogsRu: Record<keyof typeof serviceLogsEn, string> = {
  'serviceLogs.title': 'Журнал — {name}',
  'serviceLogs.empty': 'Журнал пуст.',
  'serviceLogs.loadFailed': 'Не удалось загрузить журнал этой программы.',
}
