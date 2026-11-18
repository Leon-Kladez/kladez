/**
 * «Кладезъ»: ответы, которые модель ещё пишет, — по номеру разговора.
 *
 * Раньше, если уйти из чата посреди ответа (на главную, в другой разговор), ответ обрывался
 * и пропадал: вернулся — в разговоре только вопрос. Теперь модель дописывает ответ и он
 * сохраняется, а пока она пишет, страница чата показывает уже написанное отсюда.
 *
 * У каждого запроса своя запись: остановленный «Стопом» запрос может ещё несколько секунд
 * ждать, пока Ollama загрузит модель, — и, уходя, он не должен стирать запись следующего
 * вопроса (из-за этого «Стоп» на втором вопросе не срабатывал).
 *
 * Хранится в памяти процесса: после перезапуска Кладезя недописанного ответа нет, и это честно —
 * модель тоже остановилась.
 */
export type PendingAnswer = { content: string; thinking: string; startedAt: number }
type Entry = PendingAnswer & { stop?: () => void }

const pending = new Map<number, Entry[]>()

/** Начать запись ответа; вернуть её — по ней потом дописывают и закрывают. */
export function startPending(sessionId: number, stop?: () => void): Entry {
  const entry: Entry = { content: '', thinking: '', startedAt: Date.now(), stop }
  pending.set(sessionId, [...(pending.get(sessionId) ?? []), entry])
  return entry
}

/** Кнопка «Стоп»: остановить всё, что модель пишет в этот разговор. */
export function stopPending(sessionId: number): boolean {
  const entries = pending.get(sessionId) ?? []
  for (const e of entries) e.stop?.()
  return entries.length > 0
}

export function appendPending(entry: Entry | null, content: string, thinking: string): void {
  if (!entry) return
  entry.content += content
  entry.thinking += thinking
}

/** Что модель пишет сейчас (последний запрос в разговоре). */
export function getPending(sessionId: number): PendingAnswer | null {
  const entries = pending.get(sessionId)
  const last = entries?.[entries.length - 1]
  if (!last) return null
  return { content: last.content, thinking: last.thinking, startedAt: last.startedAt }
}

/** Закрыть именно эту запись — чужие (следующий вопрос) не трогать. */
export function finishPending(sessionId: number, entry: Entry | null): void {
  if (!entry) return
  const rest = (pending.get(sessionId) ?? []).filter((e) => e !== entry)
  if (rest.length) pending.set(sessionId, rest)
  else pending.delete(sessionId)
}
