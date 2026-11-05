import type { serverOllamaServiceEn } from '../en/serverOllamaService.js'

export const serverOllamaServiceRu: Record<keyof typeof serverOllamaServiceEn, string> = {
  'server.ollamaService.aiServiceIsNotInitialized': 'ИИ-помощник ещё не готов.',
  'server.ollamaService.modelIsAlreadyInstalled': 'Модель уже установлена.',
  'server.ollamaService.modelIsNotAvailableIn': 'Модели «{model}» нет на вашем сервере ИИ. Загрузите её вручную (скачивать модели можно только через Ollama).',
  'server.ollamaService.modelDownloadedSuccessfully': 'Модель скачана.',
  'server.ollamaService.downloadCancelled': 'Скачивание отменено',
  'server.ollamaService.modelDownloadHasBeenQueued': 'Модель поставлена в очередь на скачивание. Оно начнётся, как только Ollama будет готов.',
  'server.ollamaService.failedToQueueModelDownload': 'Не удалось поставить модель в очередь. Попробуйте снова.',
  'server.ollamaService.modelDeleted': 'Модель «{modelName}» удалена.',
  'server.ollamaService.failedToDeleteModelThis': 'Не удалось удалить модель. Возможно, это не Ollama.',
}
