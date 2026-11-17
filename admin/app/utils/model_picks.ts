/**
 * «Кладезъ»: модели ИИ для «Быстрой настройки» — подобранные, а не первые три из каталога Ollama
 * (там по алфавиту выходили alfred на 24 ГБ, служебная all-minilm и athene на 30 ГБ).
 *
 * Только модели, которые официально знают русский (Qwen 2.5 — 29+ языков, Gemma 3 — 140+), от
 * быстрой до умной. Для каждой — потянет ли её этот компьютер: модели нужна память на её размер
 * и ещё около 2 ГБ на работу; Ollama в Кладезе видит память отсека WSL (по умолчанию половину).
 */
import type { NomadOllamaModel } from '../../types/ollama.js'

export type ModelFit = 'good' | 'slow' | 'too-big'

export type ModelPick = NomadOllamaModel & {
  kladez: { label: string; label_en: string; fit: ModelFit; recommended: boolean }
}

type Pick = {
  name: string
  size: string
  bytes: number
  label: string
  label_en: string
  description: string
  description_en: string
  images?: boolean
}

const GB = 1024 ** 3

export const MODEL_PICKS: Pick[] = [
  {
    name: 'qwen2.5:1.5b',
    size: '986 MB',
    bytes: 0.99 * GB,
    label: 'Самая быстрая',
    label_en: 'Fastest',
    description: 'Отвечает за секунды даже на слабом компьютере, но проще остальных и чаще ошибается.',
    description_en: 'Answers in seconds even on a weak computer, but is simpler than the others and makes more mistakes.',
  },
  {
    name: 'qwen2.5:3b',
    size: '1.9 GB',
    bytes: 1.9 * GB,
    label: 'Быстрая',
    label_en: 'Fast',
    description: 'Хороший выбор для обычного компьютера: понимает русский, отвечает быстро, справляется с простыми вопросами.',
    description_en: 'A good choice for an ordinary computer: understands Russian, answers quickly, handles simple questions.',
  },
  {
    name: 'qwen2.5:7b',
    size: '4.7 GB',
    bytes: 4.7 * GB,
    label: 'Умнее',
    label_en: 'Smarter',
    description: 'Заметно лучше рассуждает и пишет. На компьютере без видеокарты ответ — 10–30 секунд.',
    description_en: 'Noticeably better at reasoning and writing. Without a graphics card an answer takes 10–30 seconds.',
  },
  {
    name: 'gemma3:12b',
    size: '8.1 GB',
    bytes: 8.1 * GB,
    label: 'Самая умная',
    label_en: 'Smartest',
    description: 'Подробные и точные ответы, понимает картинки. Нужна память от 16 ГБ; без видеокарты отвечает медленно.',
    description_en: 'Detailed, accurate answers and understands pictures. Needs 16 GB of memory or more; slow without a graphics card.',
    images: true,
  },
]

/** Потянет ли компьютер модель: памяти с запасом — «хорошо», впритык — «медленно», меньше — «не потянет». */
export function modelFit(modelBytes: number, memoryBytes: number | null): ModelFit {
  if (!memoryBytes) return 'good'
  const need = modelBytes + 2 * GB
  if (memoryBytes >= need * 1.5) return 'good'
  if (memoryBytes >= need) return 'slow'
  return 'too-big'
}

/**
 * Список для «Быстрой настройки»: рекомендуется самая умная из тех, что работают «хорошо» (не тяжелее
 * 7B). На слабом процессоре (4 потока и меньше) — не тяжелее 3B: без видеокарты 7B там думает минуту.
 */
export function modelPicks(memoryBytes: number | null, cpus: number | null = null): ModelPick[] {
  const fits = MODEL_PICKS.map((p) => modelFit(p.bytes, memoryBytes))
  const limit = cpus !== null && cpus <= 4 ? 2 * GB : 5 * GB
  let best = -1
  MODEL_PICKS.forEach((p, i) => {
    if (fits[i] === 'good' && p.bytes <= limit) best = i
  })
  if (best < 0) best = fits[0] === 'too-big' ? -1 : 0
  return MODEL_PICKS.map((p, i) => ({
    id: `kladez-${p.name}`,
    name: p.name,
    description: p.description,
    description_en: p.description_en,
    estimated_pulls: null,
    model_last_updated: null,
    first_seen: '2026-11-17T00:00:00.000Z',
    ru: 'good' as const,
    tags: [
      {
        name: p.name,
        size: p.size,
        context: '32k',
        input: p.images ? 'Text, Image' : 'Text',
        cloud: false,
        thinking: false,
      },
    ],
    kladez: { label: p.label, label_en: p.label_en, fit: fits[i], recommended: i === best },
  }))
}
