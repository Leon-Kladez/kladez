import { cloneElement, isValidElement, type ReactNode } from 'react'
import { t, type MessageKey } from '../../constants/i18n/index.js'

/**
 * Как t(), но в фразу можно вставить элементы разметки: tx('kb.size', { size: <strong>5 ГБ</strong> }).
 * Порядок слов задаёт перевод, а не код — поэтому вставки не ломают русскую фразу.
 */
export function tx(key: MessageKey, vars: Record<string, ReactNode> = {}): ReactNode[] {
  const plain: Record<string, string | number> = {}
  const nodes: Record<string, ReactNode> = {}
  for (const [name, value] of Object.entries(vars)) {
    if (typeof value === 'string' || typeof value === 'number') plain[name] = value
    else nodes[name] = value
  }
  const text = t(key, plain)
  const out: ReactNode[] = []
  let last = 0
  const re = /\{(\w+)\}/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text))) {
    if (!(m[1] in nodes)) continue
    if (m.index > last) out.push(text.slice(last, m.index))
    const node = nodes[m[1]]
    out.push(isValidElement(node) ? cloneElement(node, { key: `${m[1]}-${out.length}` }) : node)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
