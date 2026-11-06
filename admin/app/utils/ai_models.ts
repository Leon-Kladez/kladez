import type { NomadOllamaModel } from '../../types/ollama.js'
import { getLocale, type Locale } from '../../constants/i18n/index.js'

/**
 * Kladez: the AI model list comes from collections-ru/ai-models.json (our
 * repository, or the copy built into the image) instead of NOMAD's API.
 * Cloud-only tags are dropped — Kladez runs models locally. An empty or
 * malformed answer gives null so the caller falls back.
 */
export function modelsFromCatalog(data: unknown): NomadOllamaModel[] | null {
  const models = (data as { models?: unknown } | null)?.models
  if (!Array.isArray(models)) return null
  const local = (models as NomadOllamaModel[])
    .map((m) => ({ ...m, tags: (m.tags ?? []).filter((t) => !t.cloud) }))
    .filter((m) => m.tags.length > 0)
  return local.length ? local : null
}

/**
 * Описание модели на языке интерфейса. В каталоге description — русский
 * (если перевод есть), description_en — исходный английский. По-английски
 * берём description_en, когда он есть; иначе оставляем как в каталоге.
 */
export function localizeModels(models: NomadOllamaModel[], locale: Locale = getLocale()): NomadOllamaModel[] {
  if (locale !== 'en') return models
  return models.map((m) => (m.description_en ? { ...m, description: m.description_en } : m))
}

/**
 * «1.2M» → 1 200 000. В каталоге «Кладезя» estimated_pulls бывает null
 * (у NOMAD это было обязательное поле) — тогда 0, а не падение на .endsWith.
 */
export function parsePulls(value: unknown): number {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0
  if (typeof value !== 'string') return 0
  const v = value.trim().toUpperCase()
  const multiplier = v.endsWith('K') ? 1_000 : v.endsWith('M') ? 1_000_000 : v.endsWith('B') ? 1_000_000_000 : 1
  const n = parseFloat(v) * multiplier
  return Number.isFinite(n) ? n : 0
}

/** Размер тега модели в ГБ: «4.7GB» → 4.7, «900MB» → 0.9; непонятное или null → 0. */
export function parseModelSizeGb(value: unknown): number {
  if (typeof value !== 'string') return 0
  const v = value.trim().toUpperCase()
  const factor = v.endsWith('TB') ? 1_000 : v.endsWith('GB') ? 1 : v.endsWith('MB') ? 1 / 1_000 : v.endsWith('KB') ? 1 / 1_000_000 : 0
  const n = parseFloat(v) * factor
  return Number.isFinite(n) ? n : 0
}
