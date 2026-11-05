import type { Bundle, SpecTier, ZimCategoriesSpec } from '../../types/collections.js'

/**
 * Kladez: a bundle (Аптечка / Библиотека / Всё) is one Wikipedia option plus a
 * list of category tiers. A tier brings every tier it includes (includesTier),
 * so the closure is what actually gets downloaded.
 */
export function bundleTierClosure(tierSlugs: string[], spec: ZimCategoriesSpec): SpecTier[] {
  const bySlug = new Map(spec.categories.flatMap((c) => c.tiers.map((t) => [t.slug, t] as const)))
  const out = new Map<string, SpecTier>()
  const visit = (slug: string) => {
    if (out.has(slug)) return
    const tier = bySlug.get(slug)
    if (!tier) throw new Error(`Unknown tier in bundle: ${slug}`)
    out.set(slug, tier)
    if (tier.includesTier) visit(tier.includesTier)
  }
  tierSlugs.forEach(visit)
  return [...out.values()]
}

export function bundleSizeMb(bundle: Bundle, spec: ZimCategoriesSpec, wikipediaSizeMb: number): number {
  const ids = new Map<string, number>()
  for (const tier of bundleTierClosure(bundle.tiers, spec)) {
    for (const r of tier.resources) ids.set(r.id, r.size_mb ?? 0)
  }
  return wikipediaSizeMb + [...ids.values()].reduce((a, b) => a + b, 0)
}

export type BundleStatus = 'installed' | 'downloading' | 'partial' | 'none'

/**
 * Status of a bundle from what is on disk: its Wikipedia option and, per
 * category, the highest installed (or downloading) tier. A higher tier of the
 * same category covers a lower one through includesTier.
 */
export function bundleStatus(
  bundle: Bundle,
  spec: ZimCategoriesSpec,
  state: {
    wikipedia: { option_id: string; status: string } | null
    installedTierByCategory: Record<string, string | undefined>
    downloadingTierByCategory?: Record<string, string | undefined>
  }
): BundleStatus {
  const categoryOf = new Map(spec.categories.flatMap((c) => c.tiers.map((t) => [t.slug, c.slug] as const)))
  const covers = (have: string | undefined, want: string) =>
    !!have && bundleTierClosure([have], spec).some((t) => t.slug === want)

  const wikiDone = state.wikipedia?.option_id === bundle.wikipedia && state.wikipedia.status === 'installed'
  const wikiBusy = state.wikipedia?.option_id === bundle.wikipedia && state.wikipedia.status === 'downloading'
  const done = bundle.tiers.filter((s) => covers(state.installedTierByCategory[categoryOf.get(s) ?? ''], s))
  const busy = bundle.tiers.some((s) => covers(state.downloadingTierByCategory?.[categoryOf.get(s) ?? ''], s))

  if (wikiDone && done.length === bundle.tiers.length) return 'installed'
  if (wikiBusy || busy) return 'downloading'
  if (wikiDone || done.length > 0) return 'partial'
  return 'none'
}
