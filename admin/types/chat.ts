/**
 * A single provenance entry under an assistant answer: the document a chunk of
 * injected context came from. `source` is the originating file/ZIM path and is
 * what dedupes the list; `title` is what the user actually reads.
 */
export interface ChatSource {
  title: string
  date?: string
  source?: string
}

export interface ChatMessage {
  id: string
  role: 'system' | 'user' | 'assistant'
  content: string
  images?: ChatImageAttachment[]
  timestamp: Date
  isStreaming?: boolean
  thinking?: string
  isThinking?: boolean
  thinkingDuration?: number
  /** «Кладезъ»: ответ остановили кнопкой «Стоп». */
  stopped?: boolean
  sources?: ChatSource[]
  // Generation stopped at the length limit, so the answer ends mid-thought.
  truncated?: boolean
}

export interface ChatImageAttachment {
  id: string
  name: string
  file: File
  previewUrl: string
}

export interface ChatSession {
  id: string
  title: string
  /** «Кладезъ»: закреплён наверху списка. */
  pinned?: boolean
  /** «Кладезъ»: помечен непрочитанным. */
  unread?: boolean
  lastMessage?: string
  timestamp: Date
}
