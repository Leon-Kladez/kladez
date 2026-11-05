import type { serverZimControllerEn } from '../en/serverZimController.js'

export const serverZimControllerRu: Record<keyof typeof serverZimControllerEn, string> = {
  'server.zimController.downloadStartedSuccessfully': 'Скачивание началось',
  'server.zimController.kiwixLibraryRescanned': 'Список Библиотеки обновлён',
  'server.zimController.zimFileWithKeyNot': 'Файл ZIM {filename} не найден',
  'server.zimController.zimFileDeletedSuccessfully': 'Файл ZIM удалён',
  'server.zimController.onlyZimFilesAreAccepted': 'Можно загружать только файлы .zim',
  'server.zimController.invalidFilename': 'Неверное имя файла',
  'server.zimController.aZimFileWithThat': 'Файл ZIM с таким именем уже есть',
  'server.zimController.noFileReceived': 'Файл не получен',
  'server.zimController.zimFileUploadedAndRegistered': 'Файл ZIM загружен и добавлен в Библиотеку',
  'server.zimController.uploadFailed': 'Загрузка не удалась',
  'server.zimController.customLibraryAdded': 'Источник добавлен',
  'server.zimController.customLibraryRemoved': 'Источник убран',
  'server.zimController.couldNotFetchDirectoryListing': 'Не удалось получить список файлов по этому адресу',
}
