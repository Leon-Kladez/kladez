import type { SpecResource } from '../../types/collections.js'

/**
 * Kladez: Kiwix keeps only the two latest builds of each file, so a pinned
 * Wikipedia link in the catalog goes 404 within months. Turning the option into
 * a catalog resource (id = file name without `_YYYY-MM.zim`) lets the install
 * path ask the Kiwix catalog for the newest build, exactly like category tiers.
 */
export function wikipediaOptionToResource(option: {
  id: string
  name: string
  description: string
  size_mb: number
  url: string
  version?: string | null
}): SpecResource | null {
  const filename = option.url.split('/').pop() ?? ''
  const match = /^(.+)_(\d{4}-\d{2})\.zim$/.exec(filename)
  if (!match) return null
  return {
    id: match[1],
    version: match[2],
    title: option.name,
    description: option.description,
    url: option.url,
    size_mb: option.size_mb,
  }
}
