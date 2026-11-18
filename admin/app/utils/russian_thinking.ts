/**
 * «Кладезъ»: рассуждение модели по-русски.
 *
 * «Думающие» модели рассуждают по-английски, что бы ни было написано в указаниях: проверено на
 * qwen3.5:4b — ни русская системная подсказка, ни приписка «рассуждай по-русски» к вопросу не
 * помогают, рассуждение всё равно начинается с «Thinking Process: Analyze the Request». Помогает
 * одно: начать рассуждение за модель первыми русскими словами — дальше она продолжает по-русски
 * и отвечает тоже по-русски.
 *
 * Обычный /api/chat так не умеет (начало рассуждения в нём не задать), поэтому разговор
 * собирается в разметку модели вручную и уходит в /api/generate с raw: true, а ответ делится на
 * «рассуждение» и «ответ» по метке конца рассуждения. Разметка у каждой семьи моделей своя —
 * она переписана с шаблонов самой Ollama (model/renderers, шаблоны в реестре).
 */

/** С этих слов начинается рассуждение; их видно в окне «Размышление». */
export const RU_THINK_PREFIX = 'Хорошо, пользователь'

type AnyMessage = { role?: unknown; content?: unknown; tool_calls?: unknown }
type Msg = { role: 'system' | 'user' | 'assistant'; content: string }

export type ThinkingDialect = {
  family: string
  /** Разговор в разметке модели, рассуждение открыто и начато словами `prefix`. */
  render(messages: Msg[], prefix: string): string
  /** Метка конца рассуждения: до неё — «Размышление», после — ответ. */
  close: string
  /** Служебные метки, которые могут попасть в текст ответа, — убираем. */
  junk: string[]
}

/** Qwen 3 / 3.5 / 3-VL: ChatML, рассуждение в <think>…</think>. */
const QWEN: ThinkingDialect = {
  family: 'qwen3',
  render(messages, prefix) {
    let out = ''
    for (const m of messages) out += `<|im_start|>${m.role}\n${m.content}<|im_end|>\n`
    return out + `<|im_start|>assistant\n<think>\n${prefix}`
  },
  close: '</think>',
  junk: ['<|im_end|>', '<|endoftext|>'],
}

/**
 * DeepSeek-R1: системные указания идут одним куском в самом начале, затем
 * <｜User｜>вопрос<｜Assistant｜>ответ<｜end▁of▁sentence｜>…, рассуждение в <think>…</think>.
 */
const DEEPSEEK_R1: ThinkingDialect = {
  family: 'deepseek-r1',
  render(messages, prefix) {
    let out = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n\n')
    for (const m of messages) {
      if (m.role === 'user') out += `<｜User｜>${m.content}`
      else if (m.role === 'assistant') out += `<｜Assistant｜>${m.content}<｜end▁of▁sentence｜>`
    }
    return out + `<｜Assistant｜><think>\n${prefix}`
  },
  close: '</think>',
  junk: ['<｜end▁of▁sentence｜>'],
}

/**
 * Gemma 4: <|turn>роль … <turn|>, рассуждение включается меткой <|think|> в системной части и
 * идёт в <|channel>thought … <channel|>. BOS пишется явно — токенизатор Gemma 4 его не ставит.
 */
const GEMMA4: ThinkingDialect = {
  family: 'gemma4',
  render(messages, prefix) {
    let i = 0
    const lead: string[] = []
    while (i < messages.length && messages[i].role === 'system') lead.push(messages[i++].content.trim())
    let out = `<bos><|turn>system\n<|think|>\n${lead.filter(Boolean).join('\n\n')}<turn|>\n`
    for (const m of messages.slice(i)) {
      const role = m.role === 'assistant' ? 'model' : m.role
      out += `<|turn>${role}\n${m.role === 'assistant' ? m.content : m.content.trim()}<turn|>\n`
    }
    return out + `<|turn>model\n<|channel>thought\n${prefix}`
  },
  close: '<channel|>',
  junk: ['<turn|>', '<eos>'],
}

const DIALECTS: Array<{ match: RegExp; dialect: ThinkingDialect }> = [
  { match: /^qwen3/i, dialect: QWEN },
  { match: /^deepseek-r1/i, dialect: DEEPSEEK_R1 },
  { match: /^gemma4/i, dialect: GEMMA4 },
]

/** Разметка рассуждения для модели — или null, если для этой семьи мы её не знаем. */
export function thinkingDialect(model: string): ThinkingDialect | null {
  const name = model.replace(/^.*\//, '') // «hf.co/…/qwen3…» и «library/qwen3…» → имя модели
  return DIALECTS.find((d) => d.match.test(name))?.dialect ?? null
}

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
 * Можно ли задать начало рассуждения: разметка модели нам известна, рассуждение включено, а в
 * разговоре только текст от system / user / assistant — без картинок и вызовов инструментов,
 * которые вручную собранный запрос не передаст.
 */
export function canSteerThinking(model: string, think: unknown, messages: AnyMessage[]): boolean {
  if (think !== true) return false
  if (!thinkingDialect(model)) return false
  return messages.every(
    (m) =>
      (m.role === 'system' || m.role === 'user' || m.role === 'assistant') &&
      !m.tool_calls &&
      plainText(m.content) !== null
  )
}

function toMsgs(messages: AnyMessage[]): Msg[] {
  return messages.map((m) => ({ role: m.role as Msg['role'], content: plainText(m.content) ?? '' }))
}

/** Разговор в разметке модели с открытым рассуждением в конце. */
export function renderSteeredPrompt(model: string, messages: AnyMessage[], prefix = RU_THINK_PREFIX): string {
  const dialect = thinkingDialect(model)
  if (!dialect) throw new Error(`No thinking dialect for ${model}`)
  return dialect.render(toMsgs(messages), prefix)
}

/** Прежнее имя для Qwen — оставлено для тестов и старых вызовов. */
export function renderQwenPrompt(messages: AnyMessage[], prefix = RU_THINK_PREFIX): string {
  return QWEN.render(toMsgs(messages), prefix)
}

/** Сколько последних символов `text` могут оказаться началом `tag`. */
function partialSuffix(tag: string, text: string): number {
  for (let len = Math.min(tag.length - 1, text.length); len >= 1; len--) {
    if (text.endsWith(tag.slice(0, len))) return len
  }
  return 0
}

/**
 * Делит продолжение модели на рассуждение и ответ. Начинает «внутри рассуждения» (его открыли
 * мы), ждёт метку конца — она может прийти разорванной между кусками потока.
 */
export class SteeredThinkSplitter {
  private buffer = ''
  private inThink = true
  private answerStarted = false

  constructor(private dialect: Pick<ThinkingDialect, 'close' | 'junk'>) {}

  private clean(text: string): string {
    let out = text
    for (const j of this.dialect.junk) out = out.split(j).join('')
    // После конца рассуждения модель ставит пустые строки — в ответ они не нужны.
    if (!this.answerStarted) {
      out = out.replace(/^\s+/, '')
      if (out) this.answerStarted = true
    }
    return out
  }

  push(raw: string): { thinking: string; content: string } {
    if (!this.inThink) return { thinking: '', content: this.clean(raw) }
    this.buffer += raw
    const idx = this.buffer.indexOf(this.dialect.close)
    if (idx !== -1) {
      const thinking = this.buffer.slice(0, idx)
      const rest = this.buffer.slice(idx + this.dialect.close.length)
      this.buffer = ''
      this.inThink = false
      return { thinking, content: this.clean(rest) }
    }
    const hold = partialSuffix(this.dialect.close, this.buffer)
    const thinking = this.buffer.slice(0, this.buffer.length - hold)
    this.buffer = this.buffer.slice(this.buffer.length - hold)
    return { thinking, content: '' }
  }

  flush(): { thinking: string; content: string } {
    const pending = this.buffer
    this.buffer = ''
    return this.inThink ? { thinking: pending, content: '' } : { thinking: '', content: this.clean(pending) }
  }
}
