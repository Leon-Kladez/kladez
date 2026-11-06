import { t, type MessageKey } from '../../constants/i18n/index.js'

const UNITS: Record<string, MessageKey> = {
  second: 'relTime.second',
  minute: 'relTime.minute',
  hour: 'relTime.hour',
  day: 'relTime.day',
  week: 'relTime.week',
  month: 'relTime.month',
  year: 'relTime.year',
}

/**
 * «7 months ago», «a year ago», «yesterday» (так отдаёт каталог моделей Ollama) → «7 месяцев назад».
 * Незнакомый текст возвращается без изменений.
 */
export function relativeTimeRu(text: string | null | undefined): string {
  const s = (text ?? '').trim().toLowerCase()
  if (s === 'yesterday') return t('relTime.yesterday')
  if (s === 'just now') return t('relTime.justNow')
  const m = s.match(/^(\d+|an?)\s+(second|minute|hour|day|week|month|year)s?\s+ago$/)
  if (!m) return text ?? ''
  const count = m[1] === 'a' || m[1] === 'an' ? 1 : Number(m[1])
  return t(UNITS[m[2]], { count })
}
