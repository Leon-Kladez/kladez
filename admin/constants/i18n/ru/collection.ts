import type { collectionEn } from '../en/collection.js'

export const collectionRu: Record<keyof typeof collectionEn, string> = {
  'collection.allDownloaded': 'Всё скачано',
  'collection.itemsAndSize': 'Материалов: {n} · Размер: {size}',
  'collection.state.downloading': 'Скачивается: {percent}%',
  'collection.state.starting': 'Запускаем скачивание…',
  'collection.state.waiting': 'Ждёт своей очереди: {percent}%',
  'collection.state.retrying': 'Не получилось, пробуем ещё раз: {percent}%',
  'collection.state.installed': 'Скачано',
  'collection.state.failed': 'Не удалось скачать — попробуйте ещё раз',
  'collection.state.failedSome': 'Не скачалось файлов: {failed} из {total} — попробуйте ещё раз',
  'collection.state.unavailable': 'Пока нельзя скачать — файлы ещё не выложены',
  'collection.state.partial': 'Скачано {installed} из {total}',
  'collection.state.progressLabel': 'Ход скачивания',
}
