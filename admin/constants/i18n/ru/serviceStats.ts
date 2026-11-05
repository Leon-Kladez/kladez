import type { serviceStatsEn } from '../en/serviceStats.js'

export const serviceStatsRu: Record<keyof typeof serviceStatsEn, string> = {
  'serviceStats.title': 'Нагрузка — {name}',
  'serviceStats.notRunning': 'Программа не запущена. Запустите её, чтобы увидеть нагрузку.',
  'serviceStats.empty': 'Данных пока нет.',
  'serviceStats.memory': 'Память',
  'serviceStats.refreshNote': 'Обновляется каждые 2 секунды.',
}
