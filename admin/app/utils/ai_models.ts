import type { NomadOllamaModel } from '../../types/ollama.js'

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
