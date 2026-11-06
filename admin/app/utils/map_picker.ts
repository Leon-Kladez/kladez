// Выбор страны и пакетов карт (описание части 3, §5). Чистые функции: сервер и окно выбора.
import type { Country, CountryCode } from '../../types/maps.js'
import type { MapsSpec, SpecResource } from '../../types/collections.js'
import { monthName, t } from '../../constants/i18n/index.js'

/** Страны, где больше всего русскоязычных людей, — вверху списка, в этом порядке. */
export const PRIORITY_COUNTRIES: CountryCode[] = [
  'RU', 'BY', 'UA', 'KZ', 'UZ', 'KG', 'TJ', 'TM', 'AZ', 'AM', 'GE', 'MD', 'LV', 'LT', 'EE', 'IL',
]

export function sortForPicker(countries: Country[]): Country[] {
  const rank = (c: Country) => {
    const i = PRIORITY_COUNTRIES.indexOf(c.code)
    return i === -1 ? PRIORITY_COUNTRIES.length : i
  }
  return [...countries].sort((a, b) => rank(a) - rank(b) || a.nameRu.localeCompare(b.nameRu, 'ru'))
}

const norm = (s: string) => s.toLowerCase().replace(/ё/g, 'е').trim()

/**
 * Названия, как их пишут в самих странах и в нашем списке карт; прежние формы из
 * Natural Earth остаются для поиска (кто-то ищет «Белоруссия», кто-то «Беларусь»).
 */
const RU_NAME_OVERRIDES: Record<CountryCode, { name: string; aliases: string[] }> = {
  BY: { name: 'Беларусь', aliases: ['Белоруссия'] },
  KG: { name: 'Кыргызстан', aliases: ['Киргизия'] },
  TM: { name: 'Туркменистан', aliases: ['Туркмения'] },
  MD: { name: 'Молдова', aliases: ['Молдавия'] },
}

export function ruCountryName(code: CountryCode, neName: string): string {
  return RU_NAME_OVERRIDES[code]?.name ?? neName
}

/** Поиск без учёта регистра; «ё» = «е»; по русскому и английскому названию и по коду. */
export function matchesQuery(c: Country, q: string): boolean {
  const query = norm(q)
  if (!query) return true
  const aliases = RU_NAME_OVERRIDES[c.code]?.aliases ?? []
  return [c.nameRu, c.name, c.code, ...aliases].some((s) => norm(s).includes(query))
}

/** Готовые пакеты страны (подробный вариант; обзорный выбирается переключателем). */
export function packagesForCountry(spec: MapsSpec | null, code: CountryCode): SpecResource[] {
  if (!spec) return []
  return spec.collections.flatMap((col) =>
    col.resources.filter((r) => coversCountry(r, code) && (r.detail ?? 'full') === 'full')
  )
}

/** Пакет на несколько стран («Израиль и Палестина») находится по каждой из них. */
function coversCountry(r: SpecResource, code: CountryCode): boolean {
  return r.country === code || (r.countries ?? []).includes(code)
}

export type PickerCountry = Country & { hasPackages: boolean }

export function pickerCountries(countries: Country[], spec: MapsSpec | null): PickerCountry[] {
  const withPackages = new Set(
    (spec?.collections ?? [])
      .flatMap((col) => col.resources.filter((r) => !r.planned))
      .flatMap((r) => [r.country, ...(r.countries ?? [])])
      .filter(Boolean)
  )
  return sortForPicker(countries).map((c) => ({ ...c, hasPackages: withPackages.has(c.code) }))
}

export type ExtractErrorKey = 'maps.error.protomapsUnreachable' | 'maps.error.extractFailed'

/**
 * Ошибка «вырезки на месте» → ключ перевода. Сетевые сбои почти всегда значат, что мировая карта
 * Protomaps (Cloudflare) недоступна — из России без VPN так и бывает.
 */
export function explainExtractError(stderr: string): ExtractErrorKey {
  const network = /timeout|timed out|deadline exceeded|connection reset|ECONN\w*|EAI_AGAIN|ENOTFOUND|no such host|TLS handshake|(?:status|HTTP)[\s:]*(?:403|5\d\d)\b/i
  return network.test(stderr) ? 'maps.error.protomapsUnreachable' : 'maps.error.extractFailed'
}

export type SelectionSummary = {
  ids: string[]
  bytes: number
  enough: boolean
  missingBytes: number
  /** Выбрано «обзорно», но обзорного варианта нет или он не опубликован — берётся подробный. */
  noOverview: string[]
}

/**
 * Что скачаем и хватит ли места. Для «обзорно» берётся `<id>-overview`, если он есть.
 * freeBytes = null — свободное место неизвестно, кнопку не блокируем.
 */
export function selectionSummary(
  selected: SpecResource[],
  detail: 'full' | 'overview',
  all: SpecResource[],
  freeBytes: number | null
): SelectionSummary {
  const byId = new Map(all.filter((r) => !r.planned).map((r) => [r.id, r]))
  const noOverview: string[] = []
  const chosen = selected.map((r) => {
    if (detail !== 'overview') return r
    const ov = byId.get(`${r.id}-overview`)
    if (!ov) noOverview.push(r.id)
    return ov ?? r
  })
  const bytes = chosen.reduce((sum, r) => sum + Math.round((r.size_mb ?? 0) * 1_000_000), 0)
  const missingBytes = freeBytes === null ? 0 : Math.max(0, bytes - freeBytes)
  return { ids: chosen.map((r) => r.id), bytes, enough: missingBytes === 0, missingBytes, noOverview }
}

/** «Карта от октября 2026» по версии `ГГГГ-ММ`; непонятная версия — пустая строка. */
export function formatMapVersion(version: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(version)
  if (!m) return ''
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1))
  const month = monthName(date)
  return t('mapRegions.version', { month, year: m[1] })
}

/** Версия карты из имени файла: `<id>_ГГГГ-ММ.pmtiles` или вырезка `<id>_ГГГГММДД_zN.pmtiles`. */
export function versionFromFilename(name: string): string | null {
  const curated = /_(\d{4}-\d{2})\.pmtiles$/.exec(name)
  if (curated) return curated[1]
  const extract = /_(\d{4})(\d{2})\d{2}_z\d+\.pmtiles$/.exec(name)
  return extract ? `${extract[1]}-${extract[2]}` : null
}

/** Восстановить выбор окна по уже выбранным id (возврат к шагу первой настройки). */
export function restoreSelection(ids: string[]): { selected: string[]; detail: 'full' | 'overview' } {
  const overview = ids.length > 0 && ids.every((id) => id.endsWith('-overview'))
  return {
    selected: ids.map((id) => (id.endsWith('-overview') ? id.slice(0, -'-overview'.length) : id)),
    detail: overview ? 'overview' : 'full',
  }
}
