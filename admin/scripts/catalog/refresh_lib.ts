import type { ZimCategoriesSpec } from '../../types/collections.js'
import type { CatalogResult } from '../../app/services/kiwix_catalog_service.js'
import { wikipediaOptionToResource } from '../../app/utils/wikipedia_option_resolution.js'

/**
 * Kladez: pure part of the monthly catalog refresh. Only `version`, `url` and
 * `size_mb` change, and only when Kiwix has a strictly newer build; texts and
 * order are left exactly as the authors wrote them. Inputs are not mutated.
 */
type Latest = Map<string, CatalogResult>

const toMb = (bytes: number, fallback: number) => (bytes > 0 ? Math.round(bytes / 1048576) : fallback)

export function applyLatest(spec: ZimCategoriesSpec, latest: Latest): ZimCategoriesSpec {
  const out: ZimCategoriesSpec = structuredClone(spec)
  for (const c of out.categories)
    for (const t of c.tiers)
      for (const r of t.resources) {
        const l = latest.get(`zim:${r.id}`)
        if (!l || l.version <= r.version) continue
        r.version = l.version
        r.url = l.download_url
        r.size_mb = toMb(l.size_bytes, r.size_mb)
      }
  return out
}

export function applyLatestToWikipedia<T extends { options: any[] }>(spec: T, latest: Latest): T {
  const out: T = structuredClone(spec)
  for (const o of out.options) {
    if (!o.url) continue
    const r = wikipediaOptionToResource(o)
    const l = r ? latest.get(`zim:${r.id}`) : undefined
    if (!r || !l || l.version <= r.version) continue
    o.url = l.download_url
    o.version = l.version
    o.size_mb = toMb(l.size_bytes, o.size_mb)
  }
  return out
}
