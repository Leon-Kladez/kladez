import path from 'node:path'

/**
 * Справка «Кладезя» лежит по языкам: admin/docs/<язык>/<страница>.md
 * (docs/ru/home.md, docs/en/home.md). Адрес страницы (/docs/home) одинаков
 * на всех языках, поэтому после переключения языка открыта та же страница.
 * Страницы, которой нет на текущем языке, берётся с языка по умолчанию.
 */

/** Порядок страниц в меню справки. Неизвестные — в конце, по алфавиту. */
export const DOC_ORDER: readonly string[] = [
  'home',
  'easy-setup',
  'library',
  'maps',
  'ai',
  'phones',
  'offline',
  'drug-reference',
  'supply-depot-apps',
  'updates',
  'uninstall',
  'troubleshooting',
  'about',
  'release-notes',
]

const SLUG_RE = /^[a-z0-9][a-z0-9-]*$/

/** Имя страницы из адреса: «home» или «home.md». Всё остальное (точки, слэши) — null. */
export function normalizeSlug(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const slug = raw.replace(/\.md$/, '')
  return SLUG_RE.test(slug) ? slug : null
}

/**
 * Где искать файл страницы: сначала на языке интерфейса, потом на языке
 * по умолчанию. Пути всегда внутри docsRoot.
 */
export function docCandidates(docsRoot: string, locale: string, fallback: string, slug: string): string[] {
  const langs = locale === fallback ? [locale] : [locale, fallback]
  return langs.map((lang) => path.join(docsRoot, lang, `${slug}.md`))
}

/** Заголовок страницы — первая строка «# …» файла; если её нет — имя файла. */
export function titleFromMarkdown(content: string, slug: string): string {
  const match = content.match(/^#\s+(.+?)\s*$/m)
  return match ? match[1].replace(/\s*\{%.*%\}\s*$/, '') : slug
}

/** Сортировка страниц по DOC_ORDER. */
export function sortDocs<T extends { slug: string }>(docs: T[]): T[] {
  const rank = (slug: string) => {
    const i = DOC_ORDER.indexOf(slug)
    return i === -1 ? DOC_ORDER.length : i
  }
  return [...docs].sort((a, b) => rank(a.slug) - rank(b.slug) || a.slug.localeCompare(b.slug))
}
