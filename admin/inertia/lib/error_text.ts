import { humanizeError } from '../../app/utils/user_errors.js'

const CYRILLIC = /[А-Яа-яЁё]/

/**
 * Текст ошибки для всплывающего сообщения — всегда по-русски.
 * 1) русское сообщение из ответа сервера (message / error);
 * 2) сетевые и HTTP-ошибки переводятся (humanizeError);
 * 3) любой другой английский текст заменяется запасным русским — без смеси языков.
 */
export function errorText(error: unknown, fallback: string): string {
  const e = error as { message?: unknown; response?: { data?: { message?: unknown; error?: unknown } } } | undefined
  const fromServer = e?.response?.data?.message ?? e?.response?.data?.error
  for (const candidate of [fromServer, e?.message]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue
    if (CYRILLIC.test(candidate)) return candidate
    const human = humanizeError(candidate)
    if (CYRILLIC.test(human)) return human
  }
  return fallback
}
