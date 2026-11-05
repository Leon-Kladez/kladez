import { formatBytes, t } from '../../constants/i18n/index.js'

/**
 * Сырые ошибки (сетевые, файловой системы, HTTP) — в понятный русский текст для интерфейса.
 * Применяется там, где сервер отдаёт человеку текст ошибки как есть: причины неудачных
 * скачиваний, ответы контроллеров. В журналы (logger) пишется исходный английский текст.
 */
const RULES: Array<[RegExp, (m: RegExpMatchArray) => string]> = [
  [/ENOSPC|no space left on device/i, () => t('serverError.noSpace')],
  [
    /ENOTFOUND|EAI_AGAIN|ENETUNREACH|EHOSTUNREACH|ECONNREFUSED|ECONNRESET|ETIMEDOUT|socket hang up|timeout of \d+ms exceeded|Network Error/i,
    () => t('serverError.noInternet'),
  ],
  [/(?:Failed to download: )?HTTP (\d{3})\b|status code (\d{3})/i, (m) => t('serverError.http', { status: m[1] ?? m[2] })],
  [/Download stalled/i, () => t('serverError.stalled')],
  [/Download aborted/i, () => t('serverError.aborted')],
  [/MIME type (.*) is not allowed/i, (m) => t('serverError.mime', { type: m[1].trim() || '?' })],
  [/requires an official release build/i, () => t('serverError.gated')],
]

export function humanizeError(raw: unknown): string {
  const text =
    raw instanceof Error ? raw.message : typeof raw === 'string' ? raw : raw == null ? '' : String(raw)
  if (!text.trim()) return t('common.unknownError')
  for (const [re, make] of RULES) {
    const m = text.match(re)
    if (m) return make(m)
  }
  return text
}

/** Как humanizeError, но пустая причина остаётся undefined (для необязательных полей ответа). */
export function humanizeOptional(raw: string | null | undefined): string | undefined {
  return raw && raw.trim() ? humanizeError(raw) : undefined
}

/** «Не хватает места на диске: свободно 1,5 ГБ, нужно 4 ГБ». */
export function insufficientDiskMessage(freeBytes: number, requiredBytes: number): string {
  return t('serverError.diskInsufficient', {
    free: formatBytes(freeBytes),
    required: formatBytes(requiredBytes),
  })
}
