import type { serverOllamaEn } from '../en/serverOllama.js'

export const serverOllamaRu: Record<keyof typeof serverOllamaEn, string> = {
  'serverOllama.notInstalledAfterPull': 'Ollama не сообщил об ошибке, но модель не установлена — скачивание не завершилось.',
  'serverOllama.newerVersion': 'Этой модели нужна более новая версия Ollama. Обновите ИИ-помощника на странице «Приложения».',
  'serverOllama.notFound': 'Ollama не нашёл такую модель: {error}',
  'serverOllama.downloadFailed': 'Не удалось скачать модель: {error}',
}
