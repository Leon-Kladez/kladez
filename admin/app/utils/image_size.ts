/**
 * «Кладезъ»: сколько весит образ программы до скачивания — чтобы при установке и обновлении
 * показывать проценты, а не «Выполняется…» на четверть часа (ИИ-помощник — 3,4 ГБ).
 *
 * Размеры слоёв берём из описания образа (manifest) в хранилище — Docker Hub, ghcr.io и др.;
 * вход анонимный, как у самого Docker для открытых образов. Не вышло — null, тогда показываем
 * только «скачано N МБ».
 */

export type ImageRef = { registry: string; repository: string; reference: string }

/** «ollama/ollama:0.40.16», «redis:7-alpine», «ghcr.io/kiwix/kiwix-serve:3.8.2», «x@sha256:…». */
export function parseImageRef(image: string): ImageRef {
  let rest = image.trim()
  let registry = 'registry-1.docker.io'
  const slash = rest.indexOf('/')
  if (slash > 0) {
    const first = rest.slice(0, slash)
    if (first.includes('.') || first.includes(':') || first === 'localhost') {
      registry = first === 'docker.io' ? 'registry-1.docker.io' : first
      rest = rest.slice(slash + 1)
    }
  }
  let reference = 'latest'
  const at = rest.indexOf('@')
  if (at >= 0) {
    reference = rest.slice(at + 1)
    rest = rest.slice(0, at)
  } else {
    const colon = rest.lastIndexOf(':')
    if (colon > rest.lastIndexOf('/')) {
      reference = rest.slice(colon + 1)
      rest = rest.slice(0, colon)
    }
  }
  if (registry === 'registry-1.docker.io' && !rest.includes('/')) rest = `library/${rest}`
  return { registry, repository: rest, reference }
}

const ACCEPT = [
  'application/vnd.oci.image.index.v1+json',
  'application/vnd.docker.distribution.manifest.list.v2+json',
  'application/vnd.oci.image.manifest.v1+json',
  'application/vnd.docker.distribution.manifest.v2+json',
].join(', ')

type Fetch = typeof fetch
type Layer = { digest: string; size: number }
type Manifest = {
  manifests?: Array<{ digest: string; platform?: { os?: string; architecture?: string; variant?: string } }>
  layers?: Layer[]
}

/** Bearer realm="…",service="…",scope="…" → адрес, где взять анонимный ключ. */
export function tokenUrl(challenge: string): string | null {
  if (!/^bearer\s/i.test(challenge)) return null
  const params: Record<string, string> = {}
  for (const m of challenge.matchAll(/(\w+)="([^"]*)"/g)) params[m[1].toLowerCase()] = m[2]
  if (!params.realm) return null
  const url = new URL(params.realm)
  if (params.service) url.searchParams.set('service', params.service)
  if (params.scope) url.searchParams.set('scope', params.scope)
  return url.toString()
}

export function dockerArch(nodeArch: string = process.arch): string {
  return nodeArch === 'x64' ? 'amd64' : nodeArch
}

/** Слои образа для этого компьютера (linux/amd64 или arm64) с размерами; не вышло — null. */
export async function imageLayers(image: string, fetchFn: Fetch = fetch, timeoutMs = 10000): Promise<Layer[] | null> {
  const ref = parseImageRef(image)
  const base = `https://${ref.registry}/v2/${ref.repository}`
  let token: string | null = null
  const signal = AbortSignal.timeout(timeoutMs)

  const get = async (reference: string): Promise<Manifest | null> => {
    const headers: Record<string, string> = { Accept: ACCEPT }
    if (token) headers.Authorization = `Bearer ${token}`
    let res = await fetchFn(`${base}/manifests/${reference}`, { headers, signal })
    if (res.status === 401 && !token) {
      const url = tokenUrl(res.headers.get('www-authenticate') ?? '')
      if (!url) return null
      const t = await fetchFn(url, { signal })
      if (!t.ok) return null
      const body = (await t.json()) as { token?: string; access_token?: string }
      token = body.token ?? body.access_token ?? null
      if (!token) return null
      headers.Authorization = `Bearer ${token}`
      res = await fetchFn(`${base}/manifests/${reference}`, { headers, signal })
    }
    if (!res.ok) return null
    return (await res.json()) as Manifest
  }

  try {
    let manifest = await get(ref.reference)
    if (manifest?.manifests) {
      const arch = dockerArch()
      const pick = manifest.manifests.find((m) => m.platform?.os === 'linux' && m.platform?.architecture === arch)
      manifest = pick ? await get(pick.digest) : null
    }
    const layers = manifest?.layers?.filter((l) => typeof l.size === 'number' && typeof l.digest === 'string')
    return layers && layers.length ? layers : null
  } catch {
    return null
  }
}

/**
 * Ход скачивания по событиям `docker pull`: id события — первые 12 знаков хэша слоя.
 * Уже скачанный слой («Already exists», «Download complete», «Pull complete») считается целиком.
 */
export class PullProgress {
  private sizes = new Map<string, number>()
  private got = new Map<string, number>()
  readonly total: number | null

  constructor(layers: Layer[] | null) {
    for (const l of layers ?? []) this.sizes.set(l.digest.replace(/^sha256:/, '').slice(0, 12), l.size)
    this.total = layers?.length ? layers.reduce((n, l) => n + l.size, 0) : null
  }

  /** Учесть событие; вернуть, сколько скачано всего (байт). */
  update(event: { id?: string; status?: string; progressDetail?: { current?: number } }): number {
    const id = event?.id
    if (id) {
      if (event.status === 'Downloading' && typeof event.progressDetail?.current === 'number') {
        this.got.set(id, event.progressDetail.current)
      } else if (/^(Already exists|Download complete|Pull complete|Verifying Checksum)$/.test(event.status ?? '')) {
        const size = this.sizes.get(id)
        if (size !== undefined) this.got.set(id, size)
      }
    }
    return [...this.got.values()].reduce((a, b) => a + b, 0)
  }

  /** 0–99 % (100 % — только когда Docker сказал, что всё готово); размер неизвестен — null. */
  percent(downloaded: number): number | null {
    if (!this.total) return null
    return Math.min(99, Math.floor((downloaded / this.total) * 100))
  }
}
