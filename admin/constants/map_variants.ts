// Кладезъ: у региона в наборе карт два варианта — подробный («ru-central») и обзорный
// («ru-central-overview»), а на диске держится только один. Набор считается и качается
// по регионам: регион скачан, если есть любой его вариант. Общее для сервера и экрана.

const OVERVIEW = '-overview'

/** «ru-central-overview» → «ru-central». */
export function mapRegionKey(id: string): string {
  return id.endsWith(OVERVIEW) ? id.slice(0, -OVERVIEW.length) : id
}

/**
 * По одному варианту на регион: установленный; иначе тот, что сейчас качается (busy);
 * иначе подробный. Черновые (planned) не считаются — их пока нельзя скачать.
 */
export function oneVariantPerRegion<T extends { id: string; planned?: boolean }>(
  resources: readonly T[],
  installedIds: ReadonlySet<string>,
  busy?: (r: T) => boolean
): T[] {
  const groups = new Map<string, T[]>()
  for (const r of resources) {
    if (r.planned) continue
    const key = mapRegionKey(r.id)
    const list = groups.get(key)
    if (list) list.push(r)
    else groups.set(key, [r])
  }
  const out: T[] = []
  for (const variants of groups.values()) {
    out.push(
      variants.find((r) => installedIds.has(r.id)) ??
        (busy ? variants.find(busy) : undefined) ??
        variants.find((r) => !r.id.endsWith(OVERVIEW)) ??
        variants[0]
    )
  }
  return out
}

/** Что качать по кнопке набора: недостающие регионы, подробным вариантом. */
export function missingRegionIds<T extends { id: string; planned?: boolean }>(
  resources: readonly T[],
  installedIds: ReadonlySet<string>
): string[] {
  return oneVariantPerRegion(resources, installedIds)
    .filter((r) => !installedIds.has(r.id))
    .map((r) => r.id)
}
