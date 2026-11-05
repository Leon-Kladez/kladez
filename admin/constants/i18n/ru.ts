// Русский перевод. Тип Record<MessageKey, string> не даёт пропустить ни один ключ из en.
import type { MessageKey } from './en.js'
import { testRu } from './ru/test.js'

export const ru: Record<MessageKey, string> = {
  ...testRu,
}
