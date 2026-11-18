/**
 * «Кладезъ»: «Ответить» на выделенный кусок ответа — как в Claude. Выделенное встаёт в поле
 * ввода цитатой Markdown («> …»): модель такие цитаты понимает, а в чате вопрос с цитатой
 * показывается врезкой над текстом.
 */

/** Выделенный текст → цитата для поля ввода, с пустой строкой после неё. */
export function quoteText(text: string): string {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.trimEnd())
  // Пустые строки по краям выделения не нужны, пустые внутри — оставляем абзацами.
  while (lines.length && !lines[0].trim()) lines.shift()
  while (lines.length && !lines[lines.length - 1].trim()) lines.pop()
  if (!lines.length) return ''
  return lines.map((l) => (l.trim() ? `> ${l.trim()}` : '>')).join('\n') + '\n\n'
}

/** Цитата + то, что уже набрано в поле. */
export function addQuote(current: string, selected: string): string {
  const quote = quoteText(selected)
  if (!quote) return current
  return quote + current.replace(/^\s+/, '')
}

export type QuotePart = { quote: boolean; text: string }

/** Текст вопроса → куски «цитата» / «обычный текст», чтобы показать цитату врезкой. */
export function splitQuotes(content: string): QuotePart[] {
  const parts: QuotePart[] = []
  for (const line of content.replace(/\r\n?/g, '\n').split('\n')) {
    const isQuote = /^>\s?/.test(line)
    const text = isQuote ? line.replace(/^>\s?/, '') : line
    const last = parts[parts.length - 1]
    if (last && last.quote === isQuote) last.text += '\n' + text
    else parts.push({ quote: isQuote, text })
  }
  return parts
    .map((p) => ({ ...p, text: p.quote ? p.text : p.text.replace(/^\n+|\n+$/g, '') }))
    .filter((p) => p.text.trim().length > 0)
}
