import type { serverConditionsControllerEn } from '../en/serverConditionsController.js'

export const serverConditionsControllerRu: Record<keyof typeof serverConditionsControllerEn, string> = {
  'server.conditionsController.invalidCondition': 'Неверный признак',
  'server.conditionsController.conditionNotFound': 'Признак не найден',
  'server.conditionsController.couldNotLoadCondition': 'Не удалось загрузить сведения',
  'server.conditionsController.provideEitherSlugOrQ': 'Укажите что-то одно: slug или q',
  'server.conditionsController.provideASlugOrQ': 'Укажите параметр slug или q',
}
