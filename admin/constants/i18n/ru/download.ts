import type { downloadEn } from '../en/download.js'

export const downloadRu: Record<keyof typeof downloadEn, string> = {
  'download.complete': 'Скачивание завершено',
  'download.estSpeed': 'Скорость: {speed}',
  'download.speed': '{size}/с',
  'download.activeTitle': 'Скачивается сейчас',
  'download.failed': 'Не удалось скачать',
  'download.failedWithReason': 'Не удалось скачать: {reason}',
  'download.dismissFailed': 'Убрать из списка',
  'download.retry': 'Скачать заново',
  'download.retrying': 'Пробуем снова…',
  'download.retryShort': 'Повторить',
  'download.openPage': 'Открыть страницу скачивания',
  'download.page': 'Страница скачивания',
  'download.keep': 'Оставить',
  'download.cancel': 'Отменить скачивание',
  'download.waiting': 'Ожидание…',
  'download.retryingAfterError': 'Не получилось, скоро попробуем ещё раз: {reason}',
  'download.downloading': 'Скачивается…',
  'download.noDataFor': 'Данные не приходят уже {n} мин…',
  'download.noneActive': 'Сейчас ничего не скачивается',
}
