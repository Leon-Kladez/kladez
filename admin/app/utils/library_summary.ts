/**
 * «Кладезъ»: сколько в библиотеке книг (файлов ZIM) и статей — для карточки
 * «Читать»/«Библиотека» и плашки «скачайте, пока есть интернет». Стартовый
 * файл (его кладём сами, чтобы Kiwix запустился) за книгу пользователя не считаем.
 */
export type LibrarySummary = {
  books: number
  articles: number
  /** Нет ничего, кроме стартового файла: пора предложить «Скачать знания». */
  nearlyEmpty: boolean
}

export function summarizeLibrary(
  books: { path: string; articleCount?: number }[],
  starterFilename: string
): LibrarySummary {
  const own = books.filter((b) => basename(b.path) !== starterFilename)
  const articles = own.reduce((sum, b) => sum + (Number.isFinite(b.articleCount) ? Number(b.articleCount) : 0), 0)
  return { books: own.length, articles, nearlyEmpty: own.length === 0 }
}

function basename(path: string): string {
  return path.split(/[\/]/).pop() ?? path
}
