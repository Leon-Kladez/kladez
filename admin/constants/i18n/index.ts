// Модуль переводов «Кладезъ». Общий для сервера (AdonisJS) и интерфейса (React + Inertia).
import { en, type MessageKey } from './en.js'
import { ru } from './ru.js'

export { en, ru }
export type { MessageKey }

export const LOCALE = 'ru'

export type Locale = 'ru' | 'en'
export type MessageVars = Record<string, string | number>

const DICTIONARIES: Record<Locale, Record<string, string>> = { ru, en }

/** Номер формы множественного числа: русский — «один|несколько|много», английский — «один|много». */
export function pluralIndex(n: number, forms: number): number {
  const abs = Math.abs(Math.trunc(n))
  if (forms < 3) return abs === 1 ? 0 : 1
  const mod10 = abs % 10
  const mod100 = abs % 100
  if (mod10 === 1 && mod100 !== 11) return 0
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 1
  return 2
}

function render(template: string, vars?: MessageVars): string {
  let text = template
  if (vars && vars.count !== undefined && text.includes('|')) {
    const forms = text.split('|')
    const n = Number(vars.count)
    // Дробные числа («1,5 часа») по-русски берут форму «несколько».
    const idx = Number.isInteger(n) ? pluralIndex(n, forms.length) : Math.min(1, forms.length - 1)
    text = forms[Math.min(idx, forms.length - 1)]
  }
  if (!vars) return text
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    vars[name] === undefined ? match : String(vars[name])
  )
}

/** Текст на заданном языке; пустой перевод → английский текст; нет ключа → сам ключ. */
export function tIn(locale: Locale, key: MessageKey, vars?: MessageVars): string {
  const template = DICTIONARIES[locale][key] || en[key as MessageKey] || key
  return render(template, vars)
}

/** Текст интерфейса на русском. */
export function t(key: MessageKey, vars?: MessageVars): string {
  return tIn(LOCALE, key, vars)
}

const BYTE_UNITS = ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ']

/** «0 Б», «340 МБ», «1,5 ГБ»: основание 1024, одна цифра после запятой, без «,0». */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${BYTE_UNITS[0]}`
  let unit = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), BYTE_UNITS.length - 1))
  let value = bytes / Math.pow(1024, unit)
  // 1023,96 МБ округляется до «1024 МБ» — правильнее показать «1 ГБ».
  if (Math.round(value * 10) / 10 >= 1024 && unit < BYTE_UNITS.length - 1) {
    unit += 1
    value = value / 1024
  }
  const num = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 }).format(value)
  return `${num} ${BYTE_UNITS[unit]}`
}

const DATE_FORMAT = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** «5 ноября 2026» — без « г.». */
export function formatDate(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return DATE_FORMAT.format(date).replace(/\s*г\.$/, '')
}

const TIME_FORMAT = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })

/** «5 ноября 2026, 14:30». */
export function formatDateTime(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return `${formatDate(date)}, ${TIME_FORMAT.format(date)}`
}

let REGION_NAMES: Intl.DisplayNames | null | undefined

/** Название страны по коду ISO 3166 (DE → «Германия»); если код не распознан — запасное название. */
export function countryName(code: string, fallback: string): string {
  if (REGION_NAMES === undefined) {
    try {
      REGION_NAMES = new Intl.DisplayNames(['ru'], { type: 'region', fallback: 'none' })
    } catch {
      REGION_NAMES = null
    }
  }
  if (!REGION_NAMES || !/^([A-Za-z]{2}|\d{3})$/.test(code)) return fallback
  try {
    return REGION_NAMES.of(code.toUpperCase()) || fallback
  } catch {
    return fallback
  }
}

let LANGUAGE_NAMES: Intl.DisplayNames | null | undefined

/** Название языка по коду ISO 639 (eng → «Английский»); если код не распознан — запасное название. */
export function languageName(code: string, fallback: string): string {
  if (LANGUAGE_NAMES === undefined) {
    try {
      LANGUAGE_NAMES = new Intl.DisplayNames(['ru'], { type: 'language', fallback: 'none' })
    } catch {
      LANGUAGE_NAMES = null
    }
  }
  if (!LANGUAGE_NAMES || !/^[a-z]{2,3}$/i.test(code)) return fallback
  try {
    const name = LANGUAGE_NAMES.of(code.toLowerCase())
    if (!name || name.toLowerCase() === code.toLowerCase()) return fallback
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return fallback
  }
}

const NUMBER_FORMAT = new Intl.NumberFormat('ru-RU')

/** «1 234 567», «1 234,5» — по-русски. */
export function formatNumber(n: number): string {
  return NUMBER_FORMAT.format(n)
}
