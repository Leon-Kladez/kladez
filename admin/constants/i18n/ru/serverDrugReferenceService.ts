import type { serverDrugReferenceServiceEn } from '../en/serverDrugReferenceService.js'

export const serverDrugReferenceServiceRu: Record<keyof typeof serverDrugReferenceServiceEn, string> = {
  'server.drugReferenceService.upToDateCurrentLatest': 'новейшие данные (сейчас {currentExportDate}, последние {latestExportDate})',
  'server.drugReferenceService.nothingDownloadedRunDownloadFda': 'Ничего не скачано — сначала нажмите «Скачать данные FDA».',
  'server.drugReferenceService.uninstalledFdaDrugReferenceLabels': 'Справочник лекарств FDA удалён (убрано инструкций: {rowsDropped}).',
  'server.drugReferenceService.uninstallCompletedWithIssueS': 'Удаление завершено, но были сложности ({length}): {join}',
}
