import type { serverDrugReferenceControllerEn } from '../en/serverDrugReferenceController.js'

export const serverDrugReferenceControllerRu: Record<keyof typeof serverDrugReferenceControllerEn, string> = {
  'server.drugReferenceController.invalidId': 'Неверный номер',
  'server.drugReferenceController.drugLabelNotFound': 'Инструкция к лекарству не найдена',
  'server.drugReferenceController.couldNotLoadDrugLabel': 'Не удалось загрузить инструкцию',
  'server.drugReferenceController.couldNotReadIngestStatus': 'Не удалось узнать, как идёт добавление в поиск',
  'server.drugReferenceController.couldNotTriggerDownload': 'Не удалось начать скачивание',
  'server.drugReferenceController.couldNotTriggerIngest': 'Не удалось начать добавление в поиск',
  'server.drugReferenceController.couldNotResetIngest': 'Не удалось сбросить добавление в поиск',
  'server.drugReferenceController.couldNotUninstallDrugReference': 'Не удалось удалить справочник лекарств',
}
