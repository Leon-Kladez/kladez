import KVStore from '#models/kv_store'
import { getLocale, setLocale, type Locale } from '../../constants/i18n/index.js'

/**
 * Язык интерфейса — одна настройка на весь дом (KV `ui.language`): телефоны
 * и компьютеры видят один и тот же язык. Пусто или незнакомое значение — русский.
 * Настройку перечитываем не чаще раза в RECHECK_MS: на случай, если её поменял
 * другой процесс (очередь задач), а в этом процессе смена применяется сразу.
 */
const RECHECK_MS = 10_000
let checkedAt = 0

export async function syncLocaleFromStore(force = false): Promise<Locale> {
  const now = Date.now()
  if (!force && now - checkedAt < RECHECK_MS) return getLocale()
  checkedAt = now
  try {
    return setLocale(await KVStore.getValue('ui.language'))
  } catch {
    // Нет базы (первый запуск, миграции) — остаёмся на текущем языке.
    return getLocale()
  }
}

/** Применить новый язык сразу после сохранения настройки. */
export function applyLocale(value: unknown): Locale {
  checkedAt = Date.now()
  return setLocale(value)
}
