import type { MirrorsSpec } from '../../types/collections.js'

/**
 * Kladez: fallback download addresses. Every Kiwix mirror serves the same path
 * after `/zim/`, so a mirror address is `base + rest-of-path`. Mirrors that
 * answer from Russia come first (`ru_check` from collections-ru/mirrors.json).
 */
const RU_ORDER: Record<string, number> = { ok: 0, unstable: 1, timeout: 2 }

export function mirrorCandidates(url: string, spec: MirrorsSpec | null): string[] {
  const idx = url.indexOf('/zim/')
  if (!spec || idx === -1) return [url]
  const rest = url.slice(idx + '/zim/'.length)
  const mirrors = spec.kiwix.mirrors
    .map((m, i) => ({ m, i }))
    .sort((a, b) => (RU_ORDER[a.m.ru_check] ?? 3) - (RU_ORDER[b.m.ru_check] ?? 3) || a.i - b.i)
    .map(({ m }) => m.base + rest)
  return [...new Set([url, ...mirrors])]
}

/**
 * Shared with part 3 (maps): the address for this attempt. Attempt 0 uses the
 * original, each retry the next fallback, wrapping around. The same `.tmp` is
 * resumed whichever address serves it.
 */
export function pickDownloadUrl(
  url: string,
  fallbackUrls: string[] | undefined,
  attemptsMade: number
): string {
  const list = [...new Set([url, ...(fallbackUrls ?? [])])]
  return list[Math.max(0, attemptsMade) % list.length]
}
