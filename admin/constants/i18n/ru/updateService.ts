import type { updateServiceEn } from '../en/updateService.js'

export const updateServiceRu: Record<keyof typeof updateServiceEn, string> = {
  'updateService.loadVersionsFailed': 'Не удалось получить список версий',
  'updateService.title': 'Обновление программы',
  'updateService.question': 'Обновить {name} с версии {from} до {to}?',
  'updateService.dataPreserved': 'Ваши данные и настройки при обновлении сохранятся.',
  'updateService.viewReleaseNotes': 'Что изменилось',
  'updateService.showVersions': 'Показать доступные версии',
  'updateService.hideVersions': 'Скрыть доступные версии',
  'updateService.loadingVersions': 'Загружаем версии…',
  'updateService.noVersions': 'Других версий нет',
  'updateService.latest': 'Новейшая',
  'updateService.releaseNotes': 'Что изменилось',
  'updateService.majorWarning': 'Не советуем переходить на новую основную версию (например, 1.8.2 → 2.0.0), пока вы не убедились, что она подходит к вашим настройкам. Сначала прочитайте, что изменилось, и по возможности проверьте на тестовой установке.',
}
