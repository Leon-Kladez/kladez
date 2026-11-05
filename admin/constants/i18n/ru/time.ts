import type { timeEn } from '../en/time.js'

export const timeRu: Record<keyof typeof timeEn, string> = {
  'time.justNow': 'только что',
  'time.secondsAgo': '{n} с назад',
  'time.minutesAgo': '{n} мин назад',
  'time.hoursAgo': '{n} ч назад',
}
