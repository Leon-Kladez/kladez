import type { mapsDownloadUrlEn } from '../en/mapsDownloadUrl.js'

export const mapsDownloadUrlRu: Record<keyof typeof mapsDownloadUrlEn, string> = {
  'mapsDownloadUrl.description': 'Введите адрес файла карты, который хотите скачать. Адрес должен быть доступен всем и заканчиваться на .pmtiles. Сначала мы проверим, что файл доступен, его тип и примерный размер.',
  'mapsDownloadUrl.placeholder': 'Введите адрес для скачивания…',
  'mapsDownloadUrl.checking': 'Проверяем адрес: {url}',
  'mapsDownloadUrl.unknownError': 'При проверке произошла неизвестная ошибка.',
  'mapsDownloadUrl.passed': 'Проверка пройдена. Файл: {filename}, размер: {size}',
  'mapsDownloadUrl.failed': 'Проверка не пройдена: {error}',
}
