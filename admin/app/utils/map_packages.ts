// Чистые функции карт Кладезя (описание: docs/superpowers/specs/2026-11-05-kladez-3-maps-design.md).
import type { MapsSpec } from '../../types/collections.js'

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
    c.resources.map((r) => ({
      name: new URL(r.url).pathname.split('/').pop() ?? '',
      download_url: r.url,
      size: Math.round((r.size_mb ?? 0) * 1_000_000),
    }))
  )
}
