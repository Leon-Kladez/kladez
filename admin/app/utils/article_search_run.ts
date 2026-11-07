import { SERVICE_NAMES } from '../../constants/service_names.js'
import {
  ARTICLE_SEARCH_MAX_QUERY,
  kiwixSearchUrl,
  mergeArticleHits,
  parseKiwixSearchXml,
  type ArticleHit,
} from './article_search.js'

export type ArticleSearchResult = {
  hits: ArticleHit[]
  /** Сколько книг удалось опросить. */
  searched: number
  /** Kiwix не ответил ни по одной книге (не запущен / нет сети между контейнерами). */
  unavailable: boolean
}

type BookRef = { name: string; title: string }
type FetchLike = (url: string, init?: { signal?: AbortSignal }) => Promise<{ ok: boolean; text(): Promise<string> }>

export const ARTICLE_SEARCH_TIMEOUT_MS = 5000
const PARALLEL = 4

/**
 * Kiwix изнутри сети Docker: контейнер слушает 8080 (наружу — 8090). В разработке
 * панель запущена на самом компьютере — тогда localhost:8090.
 */
export function kiwixInternalBase(env: NodeJS.ProcessEnv = process.env): string {
  if (env.KIWIX_INTERNAL_URL) return env.KIWIX_INTERNAL_URL
  return env.NODE_ENV === 'production' ? `http://${SERVICE_NAMES.KIWIX}:8080` : 'http://localhost:8090'
}

/** Поиск по каждой книге (не больше 4 сразу, по 5 с на книгу) и один общий список. */
export async function searchArticles(
  rawQuery: string,
  books: BookRef[],
  opts: { base?: string; fetch?: FetchLike; timeoutMs?: number } = {}
): Promise<ArticleSearchResult> {
  const query = rawQuery.trim().slice(0, ARTICLE_SEARCH_MAX_QUERY)
  if (!query || books.length === 0) return { hits: [], searched: 0, unavailable: false }

  const base = opts.base ?? kiwixInternalBase()
  const doFetch: FetchLike = opts.fetch ?? ((url, init) => fetch(url, init))
  const timeoutMs = opts.timeoutMs ?? ARTICLE_SEARCH_TIMEOUT_MS

  const perBook: ArticleHit[][] = new Array(books.length).fill(null).map(() => [])
  let searched = 0
  let next = 0
  async function worker() {
    while (next < books.length) {
      const i = next++
      const book = books[i]
      try {
        const res = await doFetch(kiwixSearchUrl(base, book.name, query), {
          signal: AbortSignal.timeout(timeoutMs),
        })
        // 400/404 — у книги нет полнотекстового указателя или Kiwix её не знает: пропускаем.
        if (!res.ok) {
          searched++
          continue
        }
        perBook[i] = parseKiwixSearchXml(await res.text(), book.name, book.title)
        searched++
      } catch {
        // Нет ответа — эту книгу пропускаем, остальные ищем дальше.
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(PARALLEL, books.length) }, worker))

  return { hits: mergeArticleHits(perBook, query), searched, unavailable: searched === 0 }
}
