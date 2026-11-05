import type { serverAutoUpdateServiceEn } from '../en/serverAutoUpdateService.js'

export const serverAutoUpdateServiceRu: Record<keyof typeof serverAutoUpdateServiceEn, string> = {
  'server.autoUpdateService.updateSidecarIsNotAvailable': 'Служба обновления недоступна',
  'server.autoUpdateService.aSystemUpdateIsAlready': 'Обновление программы уже идёт (этап: {stage})',
  'server.autoUpdateService.downloadSInProgress': 'Идут скачивания: {length}',
  'server.autoUpdateService.appInstallUpdateSIn': 'Идёт установка или обновление приложений: {length}',
  'server.autoUpdateService.autoUpdateIsDisabled': 'Автообновление выключено',
  'server.autoUpdateService.outsideUpdateWindow': 'Сейчас не время для обновлений ({windowStart}–{windowEnd})',
  'server.autoUpdateService.failedToDetermineEligibleVersion': 'Не удалось определить подходящую версию: {error}',
  'server.autoUpdateService.noEligibleMinorPatchUpdate': 'Подходящих небольших обновлений нет (или ещё идёт выдержка)',
  'server.autoUpdateService.preFlightBlocked': 'Предварительная проверка не пройдена: {summary}',
  'server.autoUpdateService.readyToUpdateTo': 'Готово к обновлению до {tag}',
  'server.autoUpdateService.updateRequested': 'Обновление запрошено: {tag}',
  'server.autoUpdateService.autoUpdateDisabledAfterConsecutive': 'Автообновление выключено после {failures} неудачных попыток подряд. Последняя ошибка: {reason}',
}
