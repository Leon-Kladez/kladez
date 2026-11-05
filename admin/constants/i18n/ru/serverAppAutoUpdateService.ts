import type { serverAppAutoUpdateServiceEn } from '../en/serverAppAutoUpdateService.js'

export const serverAppAutoUpdateServiceRu: Record<keyof typeof serverAppAutoUpdateServiceEn, string> = {
  'server.appAutoUpdateService.upToDate': 'Новейшая версия',
  'server.appAutoUpdateService.autoUpdateDisabledAfterRepeated': 'Автообновление выключено после нескольких неудач',
  'server.appAutoUpdateService.pinnedToLatestCannotVersion': 'Закреплено на :latest — версию проверить нельзя',
  'server.appAutoUpdateService.majorVersionManualUpdateRequired': 'Крупная версия — нужно обновить вручную',
  'server.appAutoUpdateService.coolOffPending': 'Ждёт выдержки',
  'server.appAutoUpdateService.inCoolOffHRemaining': 'Выдержка (осталось {rounded} ч)',
  'server.appAutoUpdateService.eligible': 'Можно обновить → {available_update_version}',
  'server.appAutoUpdateService.downloadSInProgress': 'Идут скачивания: {length}',
  'server.appAutoUpdateService.appHasAnOperationIn': 'С приложением уже что-то происходит (состояние: {installation_status})',
  'server.appAutoUpdateService.appAutoUpdateIsDisabled': 'Автообновление приложений выключено',
}
