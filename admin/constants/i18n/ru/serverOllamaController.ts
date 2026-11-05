import type { serverOllamaControllerEn } from '../en/serverOllamaController.js'

export const serverOllamaControllerRu: Record<keyof typeof serverOllamaControllerEn, string> = {
  'server.ollamaController.multipartChatRequestsRequireA': 'В сообщении с картинками должны быть и данные JSON.',
  'server.ollamaController.theMultipartChatPayloadIs': 'Данные сообщения повреждены (неверный JSON).',
  'server.ollamaController.imagesRequireAUserMessage': 'Картинку нужно отправлять вместе с сообщением.',
  'server.ollamaController.theSelectedModelDoesNot': 'Модель «{model}» не понимает картинки.',
  'server.ollamaController.ollamaServiceRecordNotFound': 'Запись о программе Ollama не найдена.',
  'server.ollamaController.remoteOllamaClearedLocalOllama': 'Удалённый Ollama отключён. Снова работает Ollama на этом компьютере.',
  'server.ollamaController.remoteOllamaConfigurationCleared': 'Подключение к удалённому Ollama сброшено.',
  'server.ollamaController.invalidUrl': 'Неверный адрес.',
  'server.ollamaController.couldNotConnectToHttp': 'Не удалось подключиться к {remoteUrl} (HTTP {status}). Проверьте, что сервер запущен и доступен. Ollama нужно запускать с OLLAMA_HOST=0.0.0.0.',
  'server.ollamaController.couldNotConnectToMake': 'Не удалось подключиться к {remoteUrl}. Проверьте, что сервер запущен и доступен. Ollama нужно запускать с OLLAMA_HOST=0.0.0.0.',
  'server.ollamaController.remoteOllamaConfigured': 'Удалённый Ollama подключён.',
  'server.ollamaController.modelDeleted': 'Модель удалена: {model}',
  'server.ollamaController.downloadJobDispatchedForModel': 'Скачивание модели началось: {model}',
}
