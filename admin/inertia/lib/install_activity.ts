/**
 * «Кладезъ»: «Ход установки» — по-человечески. Вместо «nomad_ollama» — «ИИ-помощник»,
 * вместо «2026-11-18T08:13:44.448Z» — «11:13:44». Без React — чтобы проверять тестами.
 */
import { t } from '../../constants/i18n/index.js'

/** Название программы по-русски; своё приложение без перевода — как есть, без «nomad_». */
export function friendlyServiceName(serviceName: string): string {
  const key = `services.${serviceName}.title`
  const title = t(key as any)
  if (title && title !== key) return title
  return serviceName.replace(/^nomad_/, '').replace(/_/g, ' ')
}

/** В тексте сообщения технические имена программ — тоже заменить на понятные. */
export function friendlyMessage(message: string, serviceName: string): string {
  if (!message) return message
  const name = friendlyServiceName(serviceName)
  return message.split(serviceName).join(`«${name}»`)
}

/** Время события: часы:минуты:секунды по часам этого компьютера; кривая дата — как пришла. */
export function activityTime(timestamp: string): string {
  const d = new Date(timestamp)
  if (Number.isNaN(d.getTime())) return timestamp
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
