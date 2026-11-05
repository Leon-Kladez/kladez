/**
 * Кладезъ: own image registry and Docker Hub mirrors.
 *
 * Docker Hub is unreliable from Russia (403 for some addresses since 2024), so registry
 * lookups for Docker Hub images fall back to mirrors listed in KLADEZ_REGISTRY_MIRRORS.
 * Checked 2026-11-05 directly (no VPN): /v2/library/redis/tags/list returns 200 on
 * mirror.gcr.io, dh-mirror.gitverse.ru and dockerhub.timeweb.cloud, all anonymously.
 */

/** Own image registry of Кладезъ — the same project whose releases the update check reads. */
export const DEFAULT_IMAGE_REPO = 'ghcr.io/leon-kladez/kladez'

const DOCKER_HUB_REGISTRY = 'registry-1.docker.io'

/** Only plain registry/path characters: the value is interpolated into a sed expression. */
const SAFE_REPO = /^[a-z0-9]+([._-][a-z0-9]+)*(\.[a-z0-9-]+)*(:[0-9]+)?(\/[a-z0-9]+([._-][a-z0-9]+)*)+$/

export function parseMirrorList(raw: string | undefined): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((m) => m.trim())
    .filter((m) => m.length > 0)
}

function mirrorHost(mirror: string): string | null {
  try {
    const url = new URL(mirror.trim())
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return url.host
  } catch {
    return null
  }
}

/**
 * Registries to try, in order, for an image hosted on `registry`. Mirrors only apply to
 * Docker Hub — exactly like the Docker daemon's own `registry-mirrors` setting.
 */
export function registryCandidates(registry: string, mirrors: string[]): string[] {
  const result = [registry]
  if (registry !== DOCKER_HUB_REGISTRY) return result
  for (const mirror of mirrors) {
    const host = mirrorHost(mirror)
    if (host && !result.includes(host)) result.push(host)
  }
  return result
}

/** Repository of the admin image: KLADEZ_IMAGE_REPO if set and safe, otherwise Кладезъ's own. */
export function resolveNomadImageRepo(envValue: string | undefined): string {
  const value = envValue?.trim()
  if (!value || !SAFE_REPO.test(value)) return DEFAULT_IMAGE_REPO
  return value
}

/**
 * Run `attempt` against each registry in order and return the first success.
 * `isPrimary` is true only for the first (original) registry, so callers can skip
 * auth for anonymous mirrors. When all fail, the primary registry's error is rethrown.
 */
export async function tryRegistriesInOrder<T>(
  registries: string[],
  attempt: (registry: string, isPrimary: boolean) => Promise<T>
): Promise<T> {
  let primaryError: unknown
  for (const [index, registry] of registries.entries()) {
    try {
      return await attempt(registry, index === 0)
    } catch (error) {
      if (index === 0) primaryError = error
    }
  }
  throw primaryError ?? new Error('No registries to try')
}
