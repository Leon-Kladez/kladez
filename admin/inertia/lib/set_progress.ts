/**
 * «Кладезъ»: состояние набора (карты, готовый набор книг) прямо на карточке —
 * «Скачивается: 42 %», «Скачано» или «Не удалось скачать». Считается из того же
 * списка загрузок, что показывает «Идущие загрузки» (/api/downloads/jobs), и из
 * того, что уже лежит на диске. Без React — чтобы проверять тестами.
 */
import type { SpecResource, SpecTier } from '../../types/collections.js'
import type { DownloadJobWithProgress } from '../../types/downloads.js'
import { oneVariantPerRegion } from '../../constants/map_variants.js'

/** Один файл набора: сколько весит и что с ним сейчас. */
export type SetItem = { sizeBytes: number } & (
  | { state: 'installed' }
  | { state: 'available' }
  | { state: 'failed' }
  | { state: 'downloading'; percent: number; job: DownloadJobWithProgress | null }
)

/**
 * running — данные идут; waiting — загрузка ждёт своей очереди;
 * retrying — прошлая попытка сорвалась, программа сама пробует ещё раз;
 * starting — человек только что нажал «Скачать», сервер ставит файлы в очередь.
 */
export type SetPhase = 'running' | 'waiting' | 'retrying' | 'starting'

export type SetProgress =
  /** В наборе нет ни одного файла, который можно скачать сейчас (ещё не выложены). */
  | { state: 'unavailable' }
  | { state: 'installed' }
  /** reason — почему прошлая попытка сорвалась (уже по-русски), когда phase = retrying. */
  | { state: 'downloading'; percent: number; phase: SetPhase; reason?: string }
  | { state: 'failed'; failed: number; total: number }
  | { state: 'idle'; installed: number; total: number }

const MB = 1024 * 1024

export function clampPercent(value: number | undefined): number {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.min(100, n))
}

/** Имя файла из адреса (без ?query). */
export function fileNameOf(url: string | null | undefined): string | null {
  if (!url) return null
  const name = url.split('?')[0].split('#')[0].split('/').pop() ?? ''
  return name || null
}

/**
 * Загрузка этого файла: тот же адрес (он же — имя задачи у RunDownloadJob, даже
 * когда качается с зеркала) или то же имя файла на диске.
 */
export function jobForUrl(
  jobs: DownloadJobWithProgress[],
  url: string | null | undefined
): DownloadJobWithProgress | undefined {
  if (!url) return undefined
  const byUrl = jobs.find((j) => j.url === url)
  if (byUrl) return byUrl
  const name = fileNameOf(url)
  if (!name) return undefined
  return jobs.find(
    (j) => (j.filepath ?? '').endsWith(`/${name}`) || (j.filepath ?? '').endsWith(`\\${name}`)
  )
}

/**
 * Файлы набора карт — по одному на регион (подробный или обзорный вариант, см. map_variants):
 * регион с любым скачанным вариантом считается скачанным. Черновые (planned) не считаются.
 */
export function mapSetItems(
  resources: SpecResource[] | undefined,
  installedIds: Iterable<string>,
  jobs: DownloadJobWithProgress[]
): SetItem[] {
  const installed = new Set(installedIds)
  const chosen = oneVariantPerRegion(resources ?? [], installed, (r) => !!jobForUrl(jobs, r.url))
  const items = chosen.map((r): SetItem => {
    const sizeBytes = Math.round((r.size_mb ?? 0) * MB)
    const job = jobForUrl(jobs, r.url)
    if (job?.status === 'failed') return { sizeBytes, state: 'failed' }
    if (job) return { sizeBytes, state: 'downloading', percent: clampPercent(job.progress), job }
    if (installed.has(r.id)) return { sizeBytes, state: 'installed' }
    return { sizeBytes, state: 'available' }
  })
  // Кладезъ: вместе с картой качаются указатель поиска и дороги — пока набор качается, они
  // тоже входят в процент (иначе карточка стоит на 0 %, пока идут дороги). Один файл на
  // несколько частей округа — один раз. Сорвавшиеся не делают весь набор «не удалось».
  const aux: SetItem[] = []
  const seen = new Set<string>()
  for (const r of chosen) {
    for (const f of [r.search, r.routes]) {
      if (!f?.url || seen.has(f.url)) continue
      seen.add(f.url)
      const sizeBytes = Math.round((f.size_mb ?? 0) * MB)
      const job = jobForUrl(jobs, f.url)
      if (job?.status === 'failed') continue
      if (job) aux.push({ sizeBytes, state: 'downloading', percent: clampPercent(job.progress), job })
      else if (installed.has(r.id)) aux.push({ sizeBytes, state: 'installed' })
    }
  }
  const active = [...items, ...aux].some((i) => i.state === 'downloading')
  return active ? [...items, ...aux] : items
}

/** Все файлы уровня темы вместе с уровнями, которые он включает (includesTier). */
export function tierResources(tiers: SpecTier[], slug: string | null | undefined): SpecResource[] {
  const out: SpecResource[] = []
  const seen = new Set<string>()
  let tier = tiers.find((t) => t.slug === slug)
  while (tier && !seen.has(tier.slug)) {
    seen.add(tier.slug)
    out.push(...tier.resources)
    tier = tier.includesTier ? tiers.find((t) => t.slug === tier!.includesTier) : undefined
  }
  return out
}

/**
 * Файлы книжного набора (уровень темы в «Каталоге материалов»): что скачано —
 * по имени файла на диске, что качается — по списку загрузок.
 */
export function zimSetItems(
  resources: SpecResource[],
  installedFileNames: Iterable<string>,
  jobs: DownloadJobWithProgress[]
): SetItem[] {
  const installed = new Set(installedFileNames)
  return resources.map((r): SetItem => {
    const sizeBytes = Math.round((r.size_mb ?? 0) * MB)
    const job = jobForUrl(jobs, r.url)
    if (job?.status === 'failed') return { sizeBytes, state: 'failed' }
    if (job) return { sizeBytes, state: 'downloading', percent: clampPercent(job.progress), job }
    const name = fileNameOf(r.url)
    if (name && installed.has(name)) return { sizeBytes, state: 'installed' }
    return { sizeBytes, state: 'available' }
  })
}

function phaseOf(items: SetItem[]): SetPhase {
  const jobs = items.flatMap((i) => (i.state === 'downloading' && i.job ? [i.job] : []))
  if (jobs.some((j) => j.status === 'active' || j.status === undefined)) return 'running'
  // BullMQ после сорвавшейся попытки держит задачу в delayed до следующей — это не «очередь».
  if (
    jobs.some(
      (j) => j.status === 'delayed' && (Boolean(j.failedReason) || (j.attemptsMade ?? 0) > 0)
    )
  )
    return 'retrying'
  if (jobs.length === 0) return 'running'
  return 'waiting'
}

/**
 * Общее состояние набора. Процент — доля байтов набора, уже лежащих на диске
 * (скачанные файлы целиком + скачанная часть идущих). Пока хоть что-то качается,
 * не больше 99 %: «100 %» без «Скачано» сбивает с толку.
 */
export function setProgress(
  items: SetItem[],
  options: { wholeSet?: boolean } = {}
): SetProgress {
  if (items.length === 0) return { state: 'unavailable' }

  const total = items.length
  const installed = items.filter((i) => i.state === 'installed').length
  const failed = items.filter((i) => i.state === 'failed').length
  // wholeSet: наборы делят книги («Аптечка» входит в «Библиотеку»). Набор «скачивается»,
  // только когда запущен он сам — ни одного его файла не осталось нетронутым.
  const untouched = items.some((i) => i.state === 'available')
  const downloading =
    items.some((i) => i.state === 'downloading') && !(options.wholeSet && untouched)

  if (downloading) {
    const totalBytes = items.reduce((acc, i) => acc + Math.max(0, i.sizeBytes), 0)
    let percent: number
    if (totalBytes > 0) {
      const done = items.reduce((acc, i) => {
        const size = Math.max(0, i.sizeBytes)
        if (i.state === 'installed') return acc + size
        if (i.state === 'downloading') return acc + (size * clampPercent(i.percent)) / 100
        return acc
      }, 0)
      percent = (done / totalBytes) * 100
    } else {
      // Размеры неизвестны — считаем файлы поровну.
      const done = items.reduce(
        (acc, i) =>
          acc +
          (i.state === 'installed'
            ? 1
            : i.state === 'downloading'
              ? clampPercent(i.percent) / 100
              : 0),
        0
      )
      percent = (done / total) * 100
    }
    const phase = phaseOf(items)
    const reason =
      phase === 'retrying'
        ? items
            .flatMap((i) => (i.state === 'downloading' && i.job?.failedReason ? [i.job.failedReason] : []))[0]
        : undefined
    return {
      state: 'downloading',
      percent: Math.min(99, Math.floor(percent)),
      phase,
      ...(reason ? { reason } : {}),
    }
  }

  if (failed > 0) return { state: 'failed', failed, total }
  if (installed === total) return { state: 'installed' }
  return { state: 'idle', installed, total }
}

/** Карточку можно нажать, чтобы скачать (или скачать заново после ошибки). */
export function canStartSet(progress: SetProgress): boolean {
  return progress.state === 'idle' || progress.state === 'failed'
}
