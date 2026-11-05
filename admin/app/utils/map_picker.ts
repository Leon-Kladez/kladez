// Выбор страны и пакетов карт (описание части 3, §5). Чистые функции: сервер и окно выбора.
import type { Country, CountryCode } from '../../types/maps.js'
import type { MapsSpec, SpecResource } from '../../types/collections.js'

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
    col.resources.filter((r) => r.country === code && (r.detail ?? 'full') === 'full')
  )
}

export type PickerCountry = Country & { hasPackages: boolean }

export function pickerCountries(countries: Country[], spec: MapsSpec | null): PickerCountry[] {
  const withPackages = new Set(
    (spec?.collections ?? []).flatMap((col) => col.resources.map((r) => r.country)).filter(Boolean)
  )
  return sortForPicker(countries).map((c) => ({ ...c, hasPackages: withPackages.has(c.code) }))
}

export type ExtractErrorKey = 'maps.error.protomapsUnreachable' | 'maps.error.extractFailed'

/**
 * Ошибка «вырезки на месте» → ключ перевода. Сетевые сбои почти всегда значат, что мировая карта
 * Protomaps (Cloudflare) недоступна — из России без VPN так и бывает.
 */
export function explainExtractError(stderr: string): ExtractErrorKey {
  const network = /timeout|timed out|deadline exceeded|connection reset|ECONN\w*|EAI_AGAIN|ENOTFOUND|no such host|TLS handshake|\b403\b|\b5\d\d\b/i
  return network.test(stderr) ? 'maps.error.protomapsUnreachable' : 'maps.error.extractFailed'
}
