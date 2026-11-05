/**
 * Kladez: where the curated catalogs come from.
 *
 * Upstream NOMAD fetched its catalogs from the Crosstalk-Solutions GitHub repo.
 * Kladez reads the Russian catalog from its own open repository instead, so the
 * app keeps working if NOMAD's servers change or are unreachable. Everything
 * here is pure (the env value is passed in) so it is unit-testable.
 */

export const DEFAULT_CATALOG_BASE_URL =
  'https://raw.githubusercontent.com/Leon-Kladez/kladez/main/collections-ru/'

export const CATALOG_FILES = {
  zim_categories: 'kiwix-categories.json',
  maps: 'maps.json',
  wikipedia: 'wikipedia.json',
  creator_packs: 'creator-packs.json',
  bundles: 'bundles.json',
  mirrors: 'mirrors.json',
} as const

export type CatalogFileType = keyof typeof CATALOG_FILES

function isHttpUrl(value: string | undefined): value is string {
  if (!value) return false
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:'
  } catch {
    return false
  }
}

export function catalogBaseUrl(envValue?: string): string {
  const value = envValue?.trim()
  if (!isHttpUrl(value)) return DEFAULT_CATALOG_BASE_URL
  return value.endsWith('/') ? value : `${value}/`
}

export function catalogUrl(type: CatalogFileType, envValue?: string): string {
  return catalogBaseUrl(envValue) + CATALOG_FILES[type]
}

/**
 * The maps list lives in the maps repository's releases (part 3), so it can be
 * pointed somewhere else than the rest of the catalog.
 */
export function mapsCatalogUrl(mapsEnvValue?: string, baseEnvValue?: string): string {
  const value = mapsEnvValue?.trim()
  return isHttpUrl(value) ? value : catalogUrl('maps', baseEnvValue)
}
