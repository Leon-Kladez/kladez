/**
 * «Кладезъ»: ответы, которые модель ещё пишет, — по номеру разговора.
 *
 * Раньше, если уйти из чата посреди ответа (на главную, в другой разговор), ответ обрывался
 * и пропадал: вернулся — в разговоре только вопрос. Теперь модель дописывает ответ и он
 * сохраняется, а пока она пишет, страница чата показывает уже написанное отсюда.
 *
 * Хранится в памяти процесса: после перезапуска Кладезя недописанного ответа нет, и это честно —
 * модель тоже остановилась.
 */
export type PendingAnswer = { content: string; thinking: string; startedAt: number }

const pending = new Map<number, PendingAnswer>()

export function startPending(sessionId: number): void {
  pending.set(sessionId, { content: '', thinking: '', startedAt: Date.now() })
}

export function appendPending(sessionId: number, content: string, thinking: string): void {
  const entry = pending.get(sessionId)
  if (!entry) return
  entry.content += content
  entry.thinking += thinking
}

export function getPending(sessionId: number): PendingAnswer | null {
  return pending.get(sessionId) ?? null
}

export function finishPending(sessionId: number): void {
  pending.delete(sessionId)
}
