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
export type PendingAnswer = { content: string; thinking: string; startedAt: number; stop?: () => void }

const pending = new Map<number, PendingAnswer>()

export function startPending(sessionId: number, stop?: () => void): void {
  pending.set(sessionId, { content: '', thinking: '', startedAt: Date.now(), stop })
}

/** Кнопка «Стоп»: остановить модель, которая пишет в этот разговор. */
export function stopPending(sessionId: number): boolean {
  const entry = pending.get(sessionId)
  if (!entry?.stop) return false
  entry.stop()
  return true
}

export function appendPending(sessionId: number, content: string, thinking: string): void {
  const entry = pending.get(sessionId)
  if (!entry) return
  entry.content += content
  entry.thinking += thinking
}

export function getPending(sessionId: number): Omit<PendingAnswer, 'stop'> | null {
  const entry = pending.get(sessionId)
  if (!entry) return null
  const { stop: _stop, ...rest } = entry
  return rest
}

export function finishPending(sessionId: number): void {
  pending.delete(sessionId)
}
