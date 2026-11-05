import type { modelDownloadEn } from '../en/modelDownload.js'

export const modelDownloadRu: Record<keyof typeof modelDownloadEn, string> = {
  'modelDownload.cancelTitle': 'Отменить скачивание?',
  'modelDownload.cancelConfirm': 'Отменить скачивание',
  'modelDownload.keepDownloading': 'Продолжить скачивание',
  'modelDownload.stopPrefix': 'Остановить скачивание ',
  'modelDownload.resumeNote': 'Уже скачанная часть останется на диске. Если позже скачать эту модель снова, скачивание продолжится с того же места, а не начнётся заново.',
  'modelDownload.activeTitle': 'Скачивание моделей ИИ',
  'modelDownload.noneActive': 'Модели сейчас не скачиваются',
}
