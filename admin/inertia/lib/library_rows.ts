/**
 * «Кладезъ»: «Добавить книги» на странице «Библиотека» — темы и строки из
 * нашего каталога (collections-ru) и состояние каждой строки: есть, качается
 * (с % и «осталось ~N мин»), можно скачать. Без React — чтобы проверять тестами.
 */
import type { CategoryWithStatus } from '../../types/collections.js'
import type { DownloadJobWithProgress, WikipediaCurrentSelection, WikipediaOption } from '../../types/downloads.js'

export type BookRow = {
  key: string
  kind: 'zim' | 'wikipedia'
  /** id ресурса каталога (wikipedia_ru_medicine_maxi) или вариант Википедии. */
  id: string
  title: string
  description: string
  sizeBytes: number
  url: string | null
  /** Имя файла из адреса — по нему находим скачивание и уже скачанную книгу. */
  filename: string | null
}

export type Topic = { slug: string; name: string; description: string; rows: BookRow[] }

export const WIKIPEDIA_TOPIC = 'wikipedia'

export function fileFromUrl(url: string | null | undefined): string | null {
  if (!url) return null
  const name = url.split('?')[0].split('/').pop() ?? ''
  return name.endsWith('.zim') ? name : null
}

const MB = 1024 * 1024

/**
 * Темы в порядке каталога; Википедия — сразу после медицины (или первой, если
 * медицины нет). Книги, повторяющиеся в нескольких уровнях темы, — один раз.
 */
export function buildTopics(
  categories: CategoryWithStatus[],
  wikipediaOptions: WikipediaOption[],
  wikipediaTopic: { name: string; description: string }
): Topic[] {
  const topics: Topic[] = categories.map((category) => {
    const seen = new Set<string>()
    const rows: BookRow[] = []
    for (const tier of category.tiers ?? []) {
      for (const r of tier.resources ?? []) {
        if (r.type === 'dataset' || seen.has(r.id)) continue
        seen.add(r.id)
        rows.push({
          key: `zim:${r.id}`,
          kind: 'zim',
          id: r.id,
          title: r.title,
          description: r.description,
          sizeBytes: Math.round((r.size_mb ?? 0) * MB),
          url: r.url,
          filename: fileFromUrl(r.url),
        })
      }
    }
    return { slug: category.slug, name: category.name, description: category.description, rows }
  })

  const wikiRows: BookRow[] = wikipediaOptions
    .filter((o) => o.id !== 'none' && o.url)
    .map((o) => ({
      key: `wikipedia:${o.id}`,
      kind: 'wikipedia' as const,
      id: o.id,
      title: o.name,
      description: o.description,
      sizeBytes: Math.round(o.size_mb * MB),
      url: o.url,
      filename: fileFromUrl(o.url),
    }))
  if (wikiRows.length > 0) {
    const wiki: Topic = { slug: WIKIPEDIA_TOPIC, ...wikipediaTopic, rows: wikiRows }
    const medicine = topics.findIndex((topic) => topic.slug === 'medicine')
    topics.splice(medicine >= 0 ? medicine + 1 : 0, 0, wiki)
  }
  return topics.filter((topic) => topic.rows.length > 0)
}

export type RowState =
  | { state: 'installed' }
  | { state: 'downloading'; percent: number; job: DownloadJobWithProgress | null }
  | { state: 'failed' }
  | { state: 'available' }

/** Та же книга, только другой версии (wikipedia_ru_medicine_maxi_2026-10 ↔ …_2026-09), — тоже «есть». */
function isInstalled(row: BookRow, installedFiles: string[]): boolean {
  return installedFiles.some(
    (file) => file === row.filename || (row.kind === 'zim' && file.startsWith(`${row.id}_`))
  )
}

export function rowState(
  row: BookRow,
  installedFiles: string[],
  jobs: DownloadJobWithProgress[],
  wikipedia: WikipediaCurrentSelection | null
): RowState {
  const job = row.filename ? jobs.find((j) => j.filepath.endsWith(`/${row.filename}`) || j.filepath.endsWith(`\\${row.filename}`) || j.url.endsWith(`/${row.filename}`)) : undefined
  if (job && job.status === 'failed') return { state: 'failed' }
  if (job) return { state: 'downloading', percent: Math.max(0, Math.min(100, Math.round(job.progress ?? 0))), job }
  if (row.kind === 'wikipedia' && wikipedia?.optionId === row.id) {
    if (wikipedia.status === 'installed') return { state: 'installed' }
    if (wikipedia.status === 'downloading') return { state: 'downloading', percent: 0, job: null }
    if (wikipedia.status === 'failed') return { state: 'failed' }
  }
  if (row.kind === 'zim' && isInstalled(row, installedFiles)) return { state: 'installed' }
  return { state: 'available' }
}

/** Сколько секунд осталось; null — пока скорость неизвестна. */
export function etaSeconds(job: DownloadJobWithProgress, bytesPerSecond: number): number | null {
  if (!job.totalBytes || job.downloadedBytes === undefined || bytesPerSecond <= 0) return null
  return Math.max(0, (job.totalBytes - job.downloadedBytes) / bytesPerSecond)
}

/** Минуты для «осталось ~N мин»: 0 — «меньше минуты»; округляем вверх. */
export function etaMinutes(seconds: number): number {
  return seconds < 60 ? 0 : Math.ceil(seconds / 60)
}
