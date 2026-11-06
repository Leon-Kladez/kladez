import type { relTimeEn } from '../en/relTime.js'

export const relTimeRu: Record<keyof typeof relTimeEn, string> = {
  'relTime.second': '{count} секунду назад|{count} секунды назад|{count} секунд назад',
  'relTime.minute': '{count} минуту назад|{count} минуты назад|{count} минут назад',
  'relTime.hour': '{count} час назад|{count} часа назад|{count} часов назад',
  'relTime.day': '{count} день назад|{count} дня назад|{count} дней назад',
  'relTime.week': '{count} неделю назад|{count} недели назад|{count} недель назад',
  'relTime.month': '{count} месяц назад|{count} месяца назад|{count} месяцев назад',
  'relTime.year': '{count} год назад|{count} года назад|{count} лет назад',
  'relTime.yesterday': 'вчера',
  'relTime.justNow': 'только что',
}
