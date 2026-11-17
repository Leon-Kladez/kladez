/**
 * «Кладезъ»: для чего модель — чтобы в каталоге моделей был фильтр «для общения / для кода /
 * понимают картинки», а служебные (для поиска по библиотеке) не путали. Общий для сервера и окна.
 */
export type ModelPurpose = 'chat' | 'code' | 'images' | 'service'

type Describable = { name: string; description?: string; tags?: Array<{ input?: string }> }

const SERVICE_RE = /embed|minilm|\bbge\b|bge-|nomic|mxbai|paraphrase|snowflake-arctic|reranker/i
const CODE_RE = /coder|codellama|codegemma|starcoder|codestral|codeqwen|devstral|sqlcoder|deepcoder|wizardcoder|\bcode\b/i
const IMAGES_RE = /(^|[-.:])vl\b|vision|llava|moondream|minicpm-v|bakllava/i

export function modelPurpose(m: Describable): ModelPurpose {
  const name = m.name ?? ''
  if (SERVICE_RE.test(name)) return 'service'
  if (CODE_RE.test(name)) return 'code'
  if (IMAGES_RE.test(name)) return 'images'
  return 'chat'
}

/** Понимает ли картинки: по названию или по входу в описании размеров («Text, Image»). */
export function modelSeesImages(m: Describable): boolean {
  return IMAGES_RE.test(m.name ?? '') || (m.tags ?? []).some((t) => /image/i.test(t.input ?? ''))
}

/** Подходит ли модель под фильтр: «картинки» — и специальные, и обычные, которые их тоже понимают. */
export function matchesPurpose(m: Describable, filter: ModelPurpose | 'all'): boolean {
  if (filter === 'all') return true
  const p = modelPurpose(m)
  if (filter === 'images') return p === 'images' || (p === 'chat' && modelSeesImages(m))
  return p === filter
}

/**
 * Основные размеры модели («qwen2.5:3b», «:7b», «:latest») — без технических вариантов сжатия
 * («:3b-instruct-q4_K_M», «:3b-q5_0»): обычному человеку они ни к чему. Нет основных — все.
 */
export function mainTags<T extends { name: string }>(tags: T[]): T[] {
  const main = tags.filter((t) => /^(latest|e?\d+(\.\d+)?[bm](-[a-z]\d+b)?)$/i.test(t.name.split(':')[1] ?? ''))
  return main.length > 0 ? main : tags
}
