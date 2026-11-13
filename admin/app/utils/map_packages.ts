// Чистые функции карт Кладезя (описание: docs/superpowers/specs/2026-11-05-kladez-3-maps-design.md).
import { join } from 'node:path'
import type { MapsSpec, SpecResource } from '../../types/collections.js'
import { KLADEZ_BASE_ASSETS_VERSION } from '../../constants/map_regions.js'
import type { RunDownloadJobParams } from '../../types/downloads.js'

export type BaseAssetsSource = { kind: 'file'; path: string } | { kind: 'url'; url: string }

/**
 * Откуда брать базовые материалы карты (стиль, шрифты, значки). Явный адрес — как в NOMAD;
 * иначе архив, встроенный в программу: карта должна открываться без интернета и без серверов NOMAD.
 */
export function pickBaseAssetsSource(
  url: string | undefined,
  bundledExists: boolean,
  bundledPath: string
): BaseAssetsSource {
  if (url) return { kind: 'url', url }
  if (bundledExists) return { kind: 'file', path: bundledPath }
  throw new Error(`Базовые материалы карт не найдены в программе (${bundledPath})`)
}

export type MapListingEntry = { name: string; download_url: string; size: number }

/** Список файлов карт из нашего maps.json — для проверки обновлений вместо репозитория NOMAD. */
export function mapsSpecToListing(spec: MapsSpec | null): MapListingEntry[] {
  if (!spec) return []
  return spec.collections.flatMap((c) =>
    downloadableResources(c.resources).map((r) => ({
      name: new URL(r.url).pathname.split('/').pop() ?? '',
      download_url: r.url,
      size: Math.round((r.size_mb ?? 0) * 1_000_000),
    }))
  )
}

/** Ресурсы, которые можно скачивать: без пометки planned (файла ещё нет). */
export function downloadableResources(resources: SpecResource[]): SpecResource[] {
  return resources.filter((r) => !r.planned)
}

/** Подробный и обзорный варианты одного региона: на диске должен остаться только один. */
export function siblingVariantId(id: string): string {
  return id.endsWith('-overview') ? id.slice(0, -'-overview'.length) : `${id}-overview`
}

/**
 * Параметры загрузки пакета карты: зеркала из каталога — по порядку после `url`
 * (механизм части 2 продолжает тот же .tmp), сумма — проверка после скачивания.
 */
export function buildPackageDownloadParams(
  resource: SpecResource,
  collectionSlug: string,
  pmtilesDir: string
): RunDownloadJobParams {
  const filename = new URL(resource.url).pathname.split('/').pop() ?? ''
  return {
    url: resource.url,
    fallbackUrls: resource.mirrors ?? [],
    expectedSha256: resource.sha256,
    filepath: join(pmtilesDir, filename),
    timeout: 30000,
    allowedMimeTypes: PMTILES_MIME_TYPES,
    forceNew: false,
    filetype: 'map',
    title: fullMapTitle(resource) || undefined,
    resourceMetadata: { resource_id: resource.id, version: resource.version, collection_ref: collectionSlug },
  }
}

export const PMTILES_MIME_TYPES = ['application/vnd.pmtiles', 'application/octet-stream']

/**
 * Регион файла указателя поиска / дорог по его имени (search-ru-volga_2026-11.sqlite → ru-volga).
 * У частей нарезанного региона (Поволжье: запад, центр, восток) файл один — от целого округа.
 */
export function dataRegion(url: string | undefined | null): string | null {
  if (!url) return null
  const name = new URL(url).pathname.split('/').pop() ?? ''
  return /^(?:search|routes)-([a-z0-9-]+)_\d{4}-\d{2}\.(?:sqlite|tar)$/.exec(name)?.[1] ?? null
}

/** Имя файла дорог по его адресу; null — адрес не похож на файл дорог. */
export function routesFilename(url: string): string | null {
  const name = new URL(url).pathname.split('/').pop() ?? ''
  return /^routes-[a-z0-9-]+_\d{4}-\d{2}\.tar$/.test(name) ? name : null
}

/** Загрузка файла дорог региона (маршруты). После скачивания распаковывается и удаляется. */
export function buildRoutesDownloadParams(resource: SpecResource, packsDir: string, title: string): RunDownloadJobParams | null {
  const r = resource.routes
  if (!r) return null
  const filename = routesFilename(r.url)
  if (!filename) return null
  return {
    url: r.url,
    expectedSha256: r.sha256,
    filepath: join(packsDir, filename),
    timeout: 30000,
    allowedMimeTypes: ['application/x-tar', 'application/octet-stream'],
    forceNew: false,
    filetype: 'map',
    title,
  }
}

/** Имя файла указателя поиска по его адресу; null — адрес не похож на указатель. */
export function searchFilename(url: string): string | null {
  const name = new URL(url).pathname.split('/').pop() ?? ''
  return /^search-[a-z0-9-]+_\d{4}-\d{2}\.sqlite$/.test(name) ? name : null
}

/**
 * Загрузка указателя поиска региона: тот же механизм, что у карт (докачка, сумма),
 * но без записи «установлено» — указатель живёт рядом с картой и удаляется вместе с ней.
 */
export function buildSearchDownloadParams(resource: SpecResource, searchDir: string, title: string): RunDownloadJobParams | null {
  const s = resource.search
  if (!s) return null
  const filename = searchFilename(s.url)
  if (!filename) return null
  return {
    url: s.url,
    expectedSha256: s.sha256,
    filepath: join(searchDir, filename),
    timeout: 30000,
    allowedMimeTypes: ['application/vnd.sqlite3', 'application/x-sqlite3', 'application/octet-stream'],
    forceNew: false,
    filetype: 'map',
    title,
  }
}

/** Ищет пакеты по id во всех коллекциях; неизвестные и ещё не опубликованные — в unavailable. */
export function findPackages(
  spec: MapsSpec | null,
  ids: string[]
): { found: { resource: SpecResource; collectionSlug: string }[]; unavailable: string[] } {
  const all = (spec?.collections ?? []).flatMap((c) => c.resources.map((resource) => ({ resource, collectionSlug: c.slug })))
  const found: { resource: SpecResource; collectionSlug: string }[] = []
  const unavailable: string[] = []
  for (const id of [...new Set(ids)]) {
    const hit = all.find((x) => x.resource.id === id)
    if (hit && !hit.resource.planned) found.push(hit)
    else unavailable.push(id)
  }
  return { found, unavailable }
}

export type Bounds = [west: number, south: number, east: number, north: number]

/** Границы из заголовка PMTiles v3 (127 байт): int32 LE ×1e7 на смещениях 102, 106, 110, 114. */
export function readPmtilesBounds(header: Buffer): Bounds | null {
  if (header.length < 127 || header.toString('latin1', 0, 7) !== 'PMTiles' || header.readUInt8(7) !== 3) return null
  const v = [102, 106, 110, 114].map((o) => header.readInt32LE(o) / 1e7)
  return [v[0], v[1], v[2], v[3]]
}

/** Общие границы скачанных регионов; шире полмира (или через линию перемены дат) — null. */
export function unionBounds(list: Bounds[]): Bounds | null {
  if (list.length === 0) return null
  const u: Bounds = [
    Math.min(...list.map((b) => b[0])),
    Math.min(...list.map((b) => b[1])),
    Math.max(...list.map((b) => b[2])),
    Math.max(...list.map((b) => b[3])),
  ]
  return u[2] - u[0] > 180 ? null : u
}

/** Подходят ли базовые материалы на диске (по метке версии из архива). */
export function baseAssetsUpToDate(marker: string | null): boolean {
  return marker !== null && marker.trim() === KLADEZ_BASE_ASSETS_VERSION
}

/**
 * Кладезъ: полное название карты — со страной в начале, чтобы в «Скачанных картах» и загрузках
 * было ясно, что это за край. В списке карт у частей других стран страна уже в названии
 * («Франция: юг», «США: Калифорния»); округам России её дописываем: «Россия: Центральный федеральный округ».
 */
export function fullMapTitle(resource: { title: string; country?: string }): string {
  const title = resource.title ?? ''
  if (resource.country === 'RU' && !title.startsWith('Россия')) return `Россия: ${title}`
  return title
}
