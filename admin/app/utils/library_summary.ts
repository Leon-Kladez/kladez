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

export type LibraryBookInput = {
  path: string
  articleCount?: number
  title?: string
  description?: string
  size?: number
}

/** Книга в «Моих книгах»: имя для адреса Kiwix (/content/<name>), название, статьи, размер. */
export type LibraryBook = {
  name: string
  file: string
  title: string
  description: string
  articles: number
  sizeBytes: number | null
  starter: boolean
}

/**
 * Счётчик на карточке — все книги, включая стартовую (это настоящая медицинская
 * Википедия); «почти пусто» — когда, кроме стартовой, ничего не скачано.
 */
export function summarizeLibrary(books: LibraryBookInput[], starterFilename: string): LibrarySummary {
  const articles = books.reduce((sum, b) => sum + articleCount(b), 0)
  const own = books.filter((b) => basename(b.path) !== starterFilename)
  return { books: books.length, articles, nearlyEmpty: own.length === 0 }
}

/** «Мои книги»: по названию, стартовая — последней (она есть у всех). */
export function libraryBooks(books: LibraryBookInput[], starterFilename: string): LibraryBook[] {
  return books
    .map((b) => {
      const file = basename(b.path)
      const name = file.replace(/\.zim$/i, '')
      return {
        name,
        file,
        title: (b.title ?? '').trim() || name,
        description: (b.description ?? '').trim(),
        articles: articleCount(b),
        // Kiwix пишет size в КБ.
        sizeBytes: Number.isFinite(b.size) ? Number(b.size) * 1024 : null,
        starter: file === starterFilename,
      }
    })
    .sort((a, b) => Number(a.starter) - Number(b.starter) || a.title.localeCompare(b.title, 'ru'))
}

function articleCount(b: { articleCount?: number }): number {
  return Number.isFinite(b.articleCount) ? Number(b.articleCount) : 0
}

function basename(path: string): string {
  return path.split(/[\/]/).pop() ?? path
}
