/**
 * «Кладезъ»: какой файл ролика «Бриф» показать и видел ли его этот браузер.
 * Без React — чтобы проверять тестами.
 */
export type BriefSources = { wide: string | null; tall: string | null }

export const BRIEF_SEEN_KEY = 'kladez:briefSeen'

export function hasBrief(sources: BriefSources | null | undefined): boolean {
  return Boolean(sources && (sources.wide || sources.tall))
}

/** Портрет или узкий экран (телефон) — 9:16, иначе 16:9; нет нужного — берём другой. */
export function chooseBriefSrc(
  sources: BriefSources | null | undefined,
  screen: { width: number; height: number }
): string | null {
  if (!sources) return null
  const portrait = screen.height > screen.width || screen.width < 640
  return portrait ? (sources.tall ?? sources.wide) : (sources.wide ?? sources.tall)
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

/** Хранилище браузера может быть недоступно (частный режим, запрет) — тогда «не видел», без ошибок. */
export function briefSeen(storage: StorageLike | null | undefined): boolean {
  try {
    return storage?.getItem(BRIEF_SEEN_KEY) === '1'
  } catch {
    return false
  }
}

export function markBriefSeen(storage: StorageLike | null | undefined): void {
  try {
    storage?.setItem(BRIEF_SEEN_KEY, '1')
  } catch {
    // Не запомнили — покажем ещё раз, это не страшно.
  }
}

/** Сам ролик открывается только на главной, только при первом входе и только если файл есть. */
export function shouldAutoOpenBrief(
  sources: BriefSources | null | undefined,
  seen: boolean,
  path: string
): boolean {
  return hasBrief(sources) && !seen && path === '/home'
}

/** localStorage, если до него можно дотянуться. */
export function browserStorage(): StorageLike | null {
  try {
    return (globalThis as { localStorage?: StorageLike }).localStorage ?? null
  } catch {
    return null
  }
}
