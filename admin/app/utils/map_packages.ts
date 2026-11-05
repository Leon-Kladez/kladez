// Чистые функции карт Кладезя (описание: docs/superpowers/specs/2026-11-05-kladez-3-maps-design.md).
import { join } from 'node:path'
import type { MapsSpec, SpecResource } from '../../types/collections.js'
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
    title: resource.title || undefined,
    resourceMetadata: { resource_id: resource.id, version: resource.version, collection_ref: collectionSlug },
  }
}

export const PMTILES_MIME_TYPES = ['application/vnd.pmtiles', 'application/octet-stream']

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
