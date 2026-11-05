import type { serverDownloadServiceEn } from '../en/serverDownloadService.js'

export const serverDownloadServiceRu: Record<keyof typeof serverDownloadServiceEn, string> = {
  'server.downloadService.fdaDrugReference': 'Справочник лекарств FDA',
  'server.downloadService.cannotRetryModelNameNot': 'Повторить нельзя: в задаче нет названия модели',
  'server.downloadService.retryingDownloadForModel': 'Повторное скачивание модели {modelName}',
  'server.downloadService.cannotRetryMissingUrlOr': 'Повторить нельзя: в задаче нет адреса или пути к файлу',
  'server.downloadService.retryingDownloadFor': 'Повторное скачивание: {url}',
  'server.downloadService.failedJobNotFoundIt': 'Задача не найдена. Возможно, её уже убрали.',
  'server.downloadService.jobNotFoundMayHave': 'Задача не найдена (возможно, уже завершилась)',
  'server.downloadService.drugDataDownloadCancelled': 'Скачивание данных о лекарствах отменено',
  'server.downloadService.couldNotCancelDrugData': 'Не удалось отменить скачивание данных о лекарствах: {msg}',
  'server.downloadService.extractCancelledAndPartialFile': 'Подготовка карты отменена, недоделанный файл удалён',
  'server.downloadService.downloadCancelledAndPartialFile': 'Скачивание отменено, недокачанный файл удалён',
  'server.downloadService.modelDownloadCancelled': 'Скачивание модели отменено',
}
