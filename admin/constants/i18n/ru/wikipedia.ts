import type { wikipediaEn } from '../en/wikipedia.js'

export const wikipediaRu: Record<keyof typeof wikipediaEn, string> = {
  'wikipedia.title': 'Википедия',
  'wikipedia.selectPackage': 'Выберите вариант Википедии',
  'wikipedia.downloading': 'Википедия скачивается… Большие варианты могут скачиваться долго.',
  'wikipedia.failed': 'Не удалось скачать Википедию. Выберите вариант и попробуйте ещё раз.',
  'wikipedia.noDownload': 'Ничего не скачивать',
  'wikipedia.remove': 'Удалить Википедию',
  'wikipedia.downloadSelected': 'Скачать выбранное',
}
