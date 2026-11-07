import { XMLParser } from 'fast-xml-parser'

/**
 * «Кладезъ»: поиск по СТАТЬЯМ во всех книгах сразу. Поле на стартовой странице
 * Kiwix ищет только по названиям книг («ожог» → «Безрезультатно»), поэтому
 * панель сама спрашивает полнотекстовый поиск Kiwix по каждой книге
 * (`/search?books.name=…&pattern=…&format=xml`) и сводит ответы в один список.
 * По одной книге за запрос — потому что Kiwix не ищет сразу по книгам на разных
 * языках. Здесь — без сети, чтобы проверять тестами.
 */
export type ArticleHit = {
  /** Имя книги для адреса читалки (имя файла без .zim). */
  book: string
  bookTitle: string
  title: string
  /** Путь статьи внутри книги, как его дал Kiwix (уже закодирован для адреса). */
  path: string
  snippet: string
}

export const ARTICLE_SEARCH_PER_BOOK = 10
export const ARTICLE_SEARCH_LIMIT = 40
export const ARTICLE_SEARCH_MAX_QUERY = 200

/** Адрес полнотекстового поиска Kiwix по одной книге. */
export function kiwixSearchUrl(base: string, book: string, query: string, count = ARTICLE_SEARCH_PER_BOOK): string {
  const params = new URLSearchParams({
    'books.name': book,
    'pattern': query,
    'format': 'xml',
    'pageLength': String(count),
  })
  return `${base.replace(/\/+$/, '')}/search?${params.toString()}`
}

function text(value: unknown): string {
  if (value === undefined || value === null) return ''
  if (typeof value === 'object') {
    const v = value as Record<string, unknown>
    return text(v['#text'] ?? '')
  }
  return String(value)
}

/** Убрать разметку (<b>…</b> и т. п.) и лишние пробелы из отрывка. */
export function plainSnippet(raw: string): string {
  return raw
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Путь статьи из ссылки Kiwix: `/content/<книга>/<путь>` → `<путь>`. */
export function articlePath(link: string, book: string): string | null {
  const noOrigin = link.replace(/^https?:\/\/[^/]+/, '')
  const prefixes = [`/content/${book}/`, `/content/${encodeURIComponent(book)}/`, `/${book}/`]
  for (const p of prefixes) {
    const at = noOrigin.indexOf(p)
    if (at !== -1) return noOrigin.slice(at + p.length) || null
  }
  return null
}

/** Ответ Kiwix (RSS/OpenSearch) → статьи одной книги. Неразборчивый ответ — пусто. */
export function parseKiwixSearchXml(xml: string, book: string, fallbackTitle: string): ArticleHit[] {
  let parsed: any
  try {
    parsed = new XMLParser({
      ignoreAttributes: true,
      isArray: (name) => name === 'item',
      processEntities: true,
      htmlEntities: true,
    }).parse(xml)
  } catch {
    return []
  }
  const items: any[] = parsed?.rss?.channel?.item ?? []
  const hits: ArticleHit[] = []
  for (const item of items) {
    const path = articlePath(text(item?.link), book)
    if (!path) continue
    const title = plainSnippet(text(item?.title)) || decodeURIComponent(path)
    hits.push({
      book,
      bookTitle: plainSnippet(text(item?.book?.title)) || fallbackTitle,
      title,
      path,
      snippet: plainSnippet(text(item?.description)).slice(0, 240),
    })
  }
  return hits
}

/**
 * Свести ответы книг в один список: сначала статьи, чьё название совпадает с
 * запросом, дальше — по очереди из каждой книги (лучшие от каждой), чтобы одна
 * большая книга не вытеснила остальные.
 */
export function mergeArticleHits(perBook: ArticleHit[][], query: string, limit = ARTICLE_SEARCH_LIMIT): ArticleHit[] {
  const q = query.trim().toLocaleLowerCase('ru')
  const exact: ArticleHit[] = []
  const rest: ArticleHit[][] = perBook.map((list) =>
    list.filter((h) => {
      if (h.title.toLocaleLowerCase('ru') === q) {
        exact.push(h)
        return false
      }
      return true
    })
  )
  const merged: ArticleHit[] = [...exact]
  const seen = new Set(merged.map((h) => `${h.book}/${h.path}`))
  for (let i = 0; merged.length < limit; i++) {
    let any = false
    for (const list of rest) {
      const h = list[i]
      if (!h) continue
      any = true
      const key = `${h.book}/${h.path}`
      if (seen.has(key)) continue
      seen.add(key)
      merged.push(h)
      if (merged.length >= limit) break
    }
    if (!any) break
  }
  return merged.slice(0, limit)
}
