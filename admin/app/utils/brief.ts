import { existsSync } from 'node:fs'

/**
 * «Кладезъ»: приветственный ролик «Бриф». Файлы лежат в образе панели
 * (admin/public/brief/, см. README там же) и отдаются как обычная статика —
 * без интернета. Пока файлов нет, кнопка «Бриф» и окно не показываются.
 */
export const BRIEF_FILES = {
  wide: 'kladez-brief-16x9.mp4',
  tall: 'kladez-brief-9x16.mp4',
} as const

export const BRIEF_URL_PREFIX = '/brief/'

export type BriefSources = { wide: string | null; tall: string | null }

export function briefSources(exists: (file: string) => boolean): BriefSources {
  return {
    wide: exists(BRIEF_FILES.wide) ? BRIEF_URL_PREFIX + BRIEF_FILES.wide : null,
    tall: exists(BRIEF_FILES.tall) ? BRIEF_URL_PREFIX + BRIEF_FILES.tall : null,
  }
}

/** Проверяем диск не чаще раза в минуту: файл могут положить, не перезапуская панель. */
const RECHECK_MS = 60_000
let cached: { value: BriefSources; at: number } | null = null

export function cachedBriefSources(dir: string, now = Date.now()): BriefSources {
  if (!cached || now - cached.at >= RECHECK_MS) {
    cached = { value: briefSources((file) => existsSync(`${dir}/${file}`)), at: now }
  }
  return cached.value
}
