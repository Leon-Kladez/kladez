/**
 * «Кладезъ»: обновился ли Кладезъ, пока страница была открыта. Без React — чтобы проверять тестами.
 * Плашку показываем, только когда версия на сервере другая и настоящая (не пусто, не «dev»).
 */
export function isNewerServerVersion(pageVersion: string | null | undefined, serverVersion: string | null | undefined): boolean {
  if (!serverVersion || !pageVersion) return false
  if (serverVersion === 'dev' || pageVersion === 'dev') return false
  return serverVersion.trim() !== pageVersion.trim()
}
