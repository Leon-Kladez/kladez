import type { errorsEn } from '../en/errors.js'

export const errorsRu: Record<keyof typeof errorsEn, string> = {
  'errors.notFound.title': 'Страница не найдена',
  'errors.notFound.text': 'Такой страницы нет.',
  'errors.server.title': 'Ошибка на сервере',
}
