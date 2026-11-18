/**
 * «Кладезъ»: рассуждение модели по-русски.
 *
 * Qwen 3 / 3.5 рассуждают по-английски, что бы ни было написано в указаниях: проверено на
 * qwen3.5:4b — ни русская системная подсказка, ни приписка «рассуждай по-русски» к вопросу не
 * помогают, рассуждение всё равно начинается с «Thinking Process: Analyze the Request». Помогает
 * одно: начать рассуждение за модель первыми русскими словами — дальше она продолжает по-русски
 * и отвечает тоже по-русски.
 *
 * Обычный /api/chat так не умеет (начало рассуждения в нём не задать), поэтому для этого случая
 * разговор собирается в формат Qwen вручную и уходит в /api/generate с raw: true, а ответ
 * разбирается на «рассуждение» и «ответ» по тегам <think>…</think>.
 */

/** С этих слов начинается рассуждение; их видно в окне «Размышление». */
export const RU_THINK_PREFIX = 'Хорошо, пользователь'

type AnyMessage = { role?: unknown; content?: unknown; tool_calls?: unknown }

/** Текст сообщения, если в нём только текст; null — если есть картинки или что-то ещё. */
function plainText(content: unknown): string | null {
  if (typeof content === 'string') return content
  if (content == null) return ''
  if (!Array.isArray(content)) return null
  const parts: string[] = []
  for (const part of content as Array<Record<string, unknown>>) {
    if (part?.type === 'text' && typeof part.text === 'string') parts.push(part.text)
    else return null
  }
  return parts.join('\n')
}

/**
 * Можно ли задать начало рассуждения: модель семейства Qwen 3 (её формат мы знаем), рассуждение
 * включено, а в разговоре только текст от system / user / assistant — без картинок и вызовов
 * инструментов, которые вручную собранный запрос не передаст.
 */
export function canSteerThinking(model: string, think: unknown, messages: AnyMessage[]): boolean {
  if (think !== true) return false
  if (!/^qwen3/i.test(model)) return false
  return messages.every(
    (m) =>
      (m.role === 'system' || m.role === 'user' || m.role === 'assistant') &&
      !m.tool_calls &&
      plainText(m.content) !== null
  )
}

/**
 * Разговор в формате Qwen (ChatML) с открытым рассуждением в конце:
 * `<|im_start|>assistant\n<think>\n` + начало рассуждения.
 */
export function renderQwenPrompt(messages: AnyMessage[], prefix = RU_THINK_PREFIX): string {
  let out = ''
  for (const m of messages) {
    out += `<|im_start|>${m.role}\n${plainText(m.content) ?? ''}<|im_end|>\n`
  }
  return out + `<|im_start|>assistant\n<think>\n${prefix}`
}
