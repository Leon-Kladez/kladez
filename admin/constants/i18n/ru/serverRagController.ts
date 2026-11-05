import type { serverRagControllerEn } from '../en/serverRagController.js'

export const serverRagControllerRu: Record<keyof typeof serverRagControllerEn, string> = {
  'server.ragController.noFileUploaded': 'Файл не загружен',
  'server.ragController.jobNotFoundForThis': 'Задача для этого файла не найдена',
  'server.ragController.sourceIsRequired': 'Не указан файл (source).',
  'server.ragController.sourceAndActiveAreRequired': 'Нужно указать source и active.',
  'server.ragController.collectionAndActiveAreRequired': 'Нужно указать collection и active.',
  'server.ragController.collectionMustBeAString': 'Раздел должен быть строкой или null.',
  'server.ragController.oldnameAndNewnameAreRequired': 'Нужно указать старое и новое название.',
  'server.ragController.nameIsRequired': 'Нужно указать название.',
  'server.ragController.errorScanningAndSyncingStorage': 'Ошибка при проверке хранилища',
  'server.ragController.errorDuringReEmbedAll': 'Ошибка при повторной подготовке',
  'server.ragController.errorDuringResetAndRebuild': 'Ошибка при сбросе и сборке заново',
  'server.ragController.fileNotFoundOrNot': 'Файл не найден или его нельзя просмотреть',
  'server.ragController.fileNotFound': 'Файл не найден',
  'server.ragController.cleanedUp': 'Убрана {count} неудачная задача|Убраны {count} неудачные задачи|Убрано {count} неудачных задач',
  'server.ragController.cancelled': 'Отменена {count} задача|Отменены {count} задачи|Отменено {count} задач',
  'server.ragController.filesDeleted': ', удалён {count} файл|, удалено {count} файла|, удалено {count} файлов',
}
