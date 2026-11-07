/**
 * Кладезъ: путь внутри отсека WSL → как его видит человек в Проводнике.
 * `/mnt/d/Kladez/library` → `D:\Kladez\library`. Путь не с диска Windows
 * возвращается как есть; пустой — пустой.
 */
export function toWindowsPath(linuxPath: string): string {
  const m = /^\/mnt\/([a-zA-Z])(\/.*)?$/.exec(linuxPath.trim())
  if (!m) return linuxPath.trim()
  const rest = (m[2] ?? '').replace(/\/+$/, '').replace(/\//g, '\\')
  return `${m[1].toUpperCase()}:${rest || '\\'}`
}
