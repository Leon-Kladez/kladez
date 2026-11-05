import type { kbEn } from '../en/kb.js'

export const kbRu: Record<keyof typeof kbEn, string> = {
  'kb.health.waiting': 'В очереди',
  'kb.health.waitingHint': 'Задача ждёт своей очереди',
  'kb.health.active': 'Идёт обработка',
  'kb.health.activeHint': 'Файл обрабатывается с обычной скоростью',
  'kb.health.slow': 'Медленно',
  'kb.health.slowHint': 'Обработка не продвигалась больше 2 минут',
  'kb.health.stalled': 'Зависло',
  'kb.health.stalledHint': 'Обработка не продвигалась больше 5 минут',
  'kb.health.failed': 'Ошибка',
  'kb.health.failedHint': 'Обработать файл не удалось',
  'kb.queue.title': 'Очередь обработки',
  'kb.queue.lastActivity': 'последнее действие {time}',
  'kb.queue.chunks': '{n} фрагмент|{n} фрагмента|{n} фрагментов',
  'kb.queue.empty': 'Сейчас ничего не обрабатывается',
}
