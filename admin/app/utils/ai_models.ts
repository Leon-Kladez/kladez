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
