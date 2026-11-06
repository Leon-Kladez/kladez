// Модуль переводов «Кладезъ». Общий для сервера (AdonisJS) и интерфейса (React + Inertia).
import { en, type MessageKey } from './en.js'
import { ru } from './ru.js'

export { en, ru }
export type { MessageKey }

export type MessageVars = Record<string, string | number>

/**
 * Языки интерфейса. Новый язык: папка словаря рядом (как ru/), строка здесь
 * и название языка на нём самом в LOCALE_NAMES — больше ничего менять не нужно.
 */
const DICTIONARIES = { ru, en } satisfies Record<string, Record<string, string>>

export type Locale = keyof typeof DICTIONARIES

/** Язык по умолчанию — русский. */
export const DEFAULT_LOCALE: Locale = 'ru'
/** @deprecated Язык по умолчанию; текущий язык — getLocale(). */
export const LOCALE = DEFAULT_LOCALE

export const SUPPORTED_LOCALES = Object.keys(DICTIONARIES) as Locale[]

/** Название каждого языка на нём самом — подпись в переключателе не переводится. */
export const LOCALE_NAMES: Record<Locale, string> = { ru: 'Русский', en: 'English' }

/** Заголовок переключателя — на обоих языках сразу, чтобы его нашёл человек, не читающий текущий язык. */
export const LANGUAGE_HEADING = 'Язык / Language'

/** Тег BCP 47 для Intl: даты, числа, названия стран. */
const INTL_TAGS: Record<Locale, string> = { ru: 'ru-RU', en: 'en-US' }

/** Любое значение → поддерживаемый язык («en», «EN», «en-US» → en); незнакомое → русский. */
export function resolveLocale(value: unknown): Locale {
  if (typeof value !== 'string') return DEFAULT_LOCALE
  const base = value.trim().toLowerCase().split(/[-_]/)[0]
  return (SUPPORTED_LOCALES as string[]).includes(base) ? (base as Locale) : DEFAULT_LOCALE
}

function initialLocale(): Locale {
  // В браузере сервер уже записал язык в <html lang> — читаем его до того,
  // как модули вычислят свои константы с t().
  const doc = (globalThis as { document?: { documentElement?: { lang?: string } } }).document
  return resolveLocale(doc?.documentElement?.lang)
}

let currentLocale: Locale = initialLocale()

/** Текущий язык интерфейса. */
export function getLocale(): Locale {
  return currentLocale
}

/** Сменить язык интерфейса (сервер — по настройке ui.language, браузер — по ответу сервера). */
export function setLocale(locale: unknown): Locale {
  currentLocale = resolveLocale(locale)
  return currentLocale
}

/** Тег для Intl по текущему языку: «ru-RU» / «en-US». */
export function intlLocale(locale: Locale = currentLocale): string {
  return INTL_TAGS[locale]
}

const DICTS: Record<Locale, Record<string, string>> = DICTIONARIES

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
  const template = DICTS[locale]?.[key] || en[key as MessageKey] || key
  return render(template, vars)
}

/** Текст интерфейса на текущем языке. */
export function t(key: MessageKey, vars?: MessageVars): string {
  return tIn(currentLocale, key, vars)
}

const BYTE_UNITS: Record<Locale, string[]> = {
  ru: ['Б', 'КБ', 'МБ', 'ГБ', 'ТБ'],
  en: ['B', 'KB', 'MB', 'GB', 'TB'],
}

/** Intl-объекты дорого создавать — по одному на язык и набор параметров. */
const intlCache = new Map<string, unknown>()
function cached<T>(key: string, make: () => T): T {
  const full = `${currentLocale}|${key}`
  if (!intlCache.has(full)) intlCache.set(full, make())
  return intlCache.get(full) as T
}

/** «0 Б», «340 МБ», «1,5 ГБ» (en: «1.5 GB»): основание 1024, одна цифра после запятой, без «,0». */
export function formatBytes(bytes: number): string {
  const units = BYTE_UNITS[currentLocale]
  if (!Number.isFinite(bytes) || bytes <= 0) return `0 ${units[0]}`
  let unit = Math.max(0, Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1))
  let value = bytes / Math.pow(1024, unit)
  // 1023,96 МБ округляется до «1024 МБ» — правильнее показать «1 ГБ».
  if (Math.round(value * 10) / 10 >= 1024 && unit < units.length - 1) {
    unit += 1
    value = value / 1024
  }
  const num = cached('bytes', () => new Intl.NumberFormat(intlLocale(), { maximumFractionDigits: 1 })).format(value)
  return `${num} ${units[unit]}`
}

function dateFormat(): Intl.DateTimeFormat {
  return cached('date', () => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' }))
}

/** «5 ноября 2026» — без « г.»; en: «November 5, 2026». */
export function formatDate(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  return dateFormat().format(date).replace(/\s*г\.$/, '')
}

/** «5 ноября 2026, 14:30»; en: «November 5, 2026, 2:30 PM». */
export function formatDateTime(d: Date | string | number): string {
  const date = d instanceof Date ? d : new Date(d)
  if (Number.isNaN(date.getTime())) return String(d)
  const time = cached('time', () => new Intl.DateTimeFormat(intlLocale(), { hour: '2-digit', minute: '2-digit' }))
  return `${formatDate(date)}, ${time.format(date)}`
}

/** Название месяца в родительном падеже (ru: «октября») / обычное (en: «October»). */
export function monthName(date: Date): string {
  const fmt = cached('month', () => new Intl.DateTimeFormat(intlLocale(), { day: 'numeric', month: 'long', timeZone: 'UTC' }))
  return fmt.formatToParts(date).find((p) => p.type === 'month')?.value ?? ''
}

function displayNames(type: 'region' | 'language'): Intl.DisplayNames | null {
  return cached(`names:${type}`, () => {
    try {
      return new Intl.DisplayNames([currentLocale], { type, fallback: 'none' })
    } catch {
      return null
    }
  })
}

/** Название страны по коду ISO 3166 (DE → «Германия»); если код не распознан — запасное название. */
export function countryName(code: string, fallback: string): string {
  const names = displayNames('region')
  if (!names || !/^([A-Za-z]{2}|\d{3})$/.test(code)) return fallback
  try {
    return names.of(code.toUpperCase()) || fallback
  } catch {
    return fallback
  }
}

/** Название языка по коду ISO 639 (eng → «Английский»); если код не распознан — запасное название. */
export function languageName(code: string, fallback: string): string {
  const names = displayNames('language')
  if (!names || !/^[a-z]{2,3}$/i.test(code)) return fallback
  try {
    const name = names.of(code.toLowerCase())
    if (!name || name.toLowerCase() === code.toLowerCase()) return fallback
    return name.charAt(0).toUpperCase() + name.slice(1)
  } catch {
    return fallback
  }
}

/** Число с заданным количеством знаков после запятой: formatDecimal(85.34) → «85,3» (замена toFixed). */
export function formatDecimal(n: number, digits = 1): string {
  return cached(`decimal:${digits}`, () =>
    new Intl.NumberFormat(intlLocale(), { minimumFractionDigits: digits, maximumFractionDigits: digits })
  ).format(n)
}

/** «1 234 567», «1 234,5» — по-русски; en: «1,234,567». */
export function formatNumber(n: number): string {
  return cached('number', () => new Intl.NumberFormat(intlLocale())).format(n)
}
