import type { serverEmbedFileJobEn } from '../en/serverEmbedFileJob.js'

export const serverEmbedFileJobRu: Record<keyof typeof serverEmbedFileJobEn, string> = {
  'server.embedFileJob.batchEmbeddedChunksNextBatch': 'Подготовлено фрагментов: {chunks}, следующая часть в очереди',
  'server.embedFileJob.successfullyEmbeddedChunks': 'Подготовлено фрагментов: {chunks}',
  'server.embedFileJob.unknownError': 'Неизвестная ошибка',
  'server.embedFileJob.embeddingJobAlreadyExistsFor': 'Файл уже в очереди на подготовку: {fileName}',
  'server.embedFileJob.fileQueuedForEmbedding': 'Файл поставлен в очередь на подготовку: {fileName}',
}
