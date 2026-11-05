import type { serverCreatorPacksControllerEn } from '../en/serverCreatorPacksController.js'

export const serverCreatorPacksControllerRu: Record<keyof typeof serverCreatorPacksControllerEn, string> = {
  'server.creatorPacksController.failedToLoadCreatorPacks': 'Не удалось загрузить наборы авторов',
  'server.creatorPacksController.packDownloadStarted': 'Скачивание набора началось',
  'server.creatorPacksController.packIsAlreadyInstalled': 'Набор уже установлен',
  'server.creatorPacksController.packDownloadIsAlreadyIn': 'Набор уже скачивается',
  'server.creatorPacksController.creatorPackNotFound': 'Набор автора не найден: {packId}',
  'server.creatorPacksController.creatorPacksAreNotConfigured': 'Наборы авторов на этом сервере не настроены',
  'server.creatorPacksController.packUninstalled': 'Набор удалён',
  'server.creatorPacksController.creatorPackIsNotInstalled': 'Набор автора не установлен: {packId}',
}
