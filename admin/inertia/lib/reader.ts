/**
 * «Кладезъ»: адреса читалки Kiwix. `/viewer#<книга>` — так открывает книгу
 * сама стартовая страница Kiwix: сразу главная страница книги, с панелью Kiwix
 * сверху (поиск внутри книги, «домой»). Статья — `/viewer#<книга>/<путь>`.
 */
export function bookReaderUrl(base: string, book: string): string {
  return `${base.replace(/\/+$/, '')}/viewer#${encodeURIComponent(book)}`
}

/** `path` — как его дал Kiwix в результатах поиска (уже закодирован). */
export function articleReaderUrl(base: string, book: string, path: string): string {
  return `${bookReaderUrl(base, book)}/${path.replace(/^\/+/, '')}`
}
