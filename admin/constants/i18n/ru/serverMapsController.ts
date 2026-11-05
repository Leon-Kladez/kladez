import type { serverMapsControllerEn } from '../en/serverMapsController.js'

export const serverMapsControllerRu: Record<keyof typeof serverMapsControllerEn, string> = {
  'server.mapsController.couldNotDownloadTheBase': 'Не удалось скачать общую карту. Подключите компьютер к интернету и попробуйте снова.',
  'server.mapsController.downloadStartedSuccessfully': 'Скачивание началось',
  'server.mapsController.collectionDownloadStartedSuccessfully': 'Скачивание набора началось',
  'server.mapsController.extractStartedSuccessfully': 'Подготовка карты началась',
  'server.mapsController.baseMapAssetsAreMissing': 'Основы для карт нет, и скачать её не удалось. Проверьте подключение к интернету и попробуйте снова.',
  'server.mapsController.mapFileWithKeyNot': 'Файл карты {filename} не найден',
  'server.mapsController.mapFileDeletedSuccessfully': 'Файл карты удалён',
  'server.mapsController.markerNotFound': 'Метка не найдена',
  'server.mapsController.markerDeleted': 'Метка удалена',
}
