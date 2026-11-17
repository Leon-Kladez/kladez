/**
 * «Кладезъ»: модели ИИ для «Быстрой настройки» — подобранные, а не первые три из каталога Ollama
 * (там по алфавиту выходили alfred на 24 ГБ, служебная all-minilm и athene на 30 ГБ).
 *
 * Только модели, которые официально знают русский и английский (Qwen 2.5 — 29+ языков, Gemma 3 —
 * 140+). Два ряда: для обычного компьютера и для мощного (32 ГБ памяти и больше, лучше с видеокартой).
 * Для каждой — потянет ли её этот компьютер: модели нужна память на её размер и ещё около 2 ГБ на
 * работу; Ollama в Кладезе видит память отсека WSL (по умолчанию половину памяти Windows).
 */
import type { NomadOllamaModel } from '../../types/ollama.js'

export type ModelFit = 'good' | 'slow' | 'too-big'
export type ModelGroup = 'home' | 'power' | 'english'

export type ModelPick = NomadOllamaModel & {
  kladez: { label: string; label_en: string; fit: ModelFit; recommended: boolean; group: ModelGroup }
}

type Pick = {
  name: string
  size: string
  bytes: number
  group: ModelGroup
  label: string
  label_en: string
  description: string
  description_en: string
  images?: boolean
  /** Как понимает русский: по умолчанию 'good'; у английских — 'fair' или не указан (слабо). */
  ru?: 'fair'
}

const GB = 1024 ** 3

export const MODEL_PICKS: Pick[] = [
  {
    name: 'qwen2.5:1.5b',
    size: '986 MB',
    bytes: 0.99 * GB,
    group: 'home',
    label: 'Самая быстрая',
    label_en: 'Fastest',
    description: 'Отвечает за секунды даже на слабом компьютере, но проще остальных и чаще ошибается.',
    description_en: 'Answers in seconds even on a weak computer, but is simpler than the others and makes more mistakes.',
  },
  {
    name: 'qwen2.5:3b',
    size: '1.9 GB',
    bytes: 1.9 * GB,
    group: 'home',
    label: 'Быстрая',
    label_en: 'Fast',
    description: 'Хороший выбор для обычного компьютера: отвечает быстро, справляется с простыми вопросами.',
    description_en: 'A good choice for an ordinary computer: answers quickly, handles simple questions.',
  },
  {
    name: 'qwen2.5:7b',
    size: '4.7 GB',
    bytes: 4.7 * GB,
    group: 'home',
    label: 'Умнее',
    label_en: 'Smarter',
    description: 'Заметно лучше рассуждает и пишет. На компьютере без видеокарты ответ — 10–30 секунд.',
    description_en: 'Noticeably better at reasoning and writing. Without a graphics card an answer takes 10–30 seconds.',
  },
  {
    name: 'gemma3:12b',
    size: '8.1 GB',
    bytes: 8.1 * GB,
    group: 'home',
    label: 'Ещё умнее',
    label_en: 'Even smarter',
    description: 'Подробные и точные ответы, понимает картинки. Нужна память от 16 ГБ; без видеокарты отвечает медленно.',
    description_en: 'Detailed, accurate answers and understands pictures. Needs 16 GB of memory or more; slow without a graphics card.',
    images: true,
  },
  {
    name: 'qwen2.5:14b',
    size: '9.0 GB',
    bytes: 9.0e9,
    group: 'power',
    label: 'Сильная',
    label_en: 'Strong',
    description: 'Хорошо рассуждает, пишет и считает. Для компьютера с 32 ГБ памяти; с видеокартой — быстро.',
    description_en: 'Good at reasoning, writing and maths. For a computer with 32 GB of memory; fast with a graphics card.',
  },
  {
    name: 'gemma3:27b',
    size: '17.4 GB',
    bytes: 17.4e9,
    group: 'power',
    label: 'Очень сильная',
    label_en: 'Very strong',
    description: 'Ответы почти как у больших онлайн-помощников, понимает картинки. Нужны 32–64 ГБ памяти, лучше видеокарта.',
    description_en: 'Answers close to large online assistants, understands pictures. Needs 32–64 GB of memory, ideally a graphics card.',
    images: true,
  },
  {
    name: 'qwen2.5:72b',
    size: '47.4 GB',
    bytes: 47.4e9,
    group: 'power',
    label: 'Самая сильная',
    label_en: 'Strongest',
    description: 'Самая умная из тех, что работают без интернета. Для рабочей станции: 64 ГБ памяти и больше, мощная видеокарта.',
    description_en: 'The smartest that works without internet. For a workstation: 64 GB of memory or more and a powerful graphics card.',
  },
  // Сильнее всего на английском: русский понимают хуже (ru — 'fair' или не указан), рекомендуем не их.
  {
    name: 'llama3.1:8b',
    size: '4.9 GB',
    bytes: 4.9e9,
    group: 'english',
    label: 'Английская: обычная',
    label_en: 'English: standard',
    description: 'Llama 3.1 от Meta — одна из самых популярных моделей. Лучше всего на английском, русский понимает хуже.',
    description_en: 'Llama 3.1 by Meta, one of the most popular models. Best in English; weaker in Russian.',
    ru: 'fair',
  },
  {
    name: 'phi4:14b',
    size: '9.1 GB',
    bytes: 9.1e9,
    group: 'english',
    label: 'Английская: рассуждения',
    label_en: 'English: reasoning',
    description: 'Phi-4 от Microsoft — сильна в логике, математике и науке. Отвечает по-английски; русский — слабо.',
    description_en: 'Phi-4 by Microsoft, strong in logic, maths and science. Answers in English; weak in Russian.',
  },
  {
    name: 'llama3.3:70b',
    size: '42.5 GB',
    bytes: 42.5e9,
    group: 'english',
    label: 'Английская: самая сильная',
    label_en: 'English: strongest',
    description: 'Llama 3.3 70B — уровень больших онлайн-помощников на английском. Для рабочей станции: 64 ГБ памяти и больше.',
    description_en: 'Llama 3.3 70B, close to large online assistants in English. For a workstation: 64 GB of memory or more.',
    ru: 'fair',
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
 * Насколько большую модель рекомендовать: без видеокарты модель думает процессором — на слабом
 * (4 потока и меньше) не больше 3B, на обычном — 7B, на мощном (12+ потоков) — 14B; с видеокартой — до 27B.
 */
export function recommendLimit(cpus: number | null, gpu: boolean): number {
  if (gpu) return 20 * GB
  if (cpus !== null && cpus <= 4) return 2 * GB
  if (cpus !== null && cpus >= 12) return 10 * GB
  return 5 * GB
}

/** Список для «Быстрой настройки»: рекомендуется самая умная из тех, что работают «хорошо» и не больше предела. */
export function modelPicks(memoryBytes: number | null, cpus: number | null = null, gpu = false): ModelPick[] {
  const fits = MODEL_PICKS.map((p) => modelFit(p.bytes, memoryBytes))
  const limit = recommendLimit(cpus, gpu)
  let best = -1
  MODEL_PICKS.forEach((p, i) => {
    if (fits[i] === 'good' && p.bytes <= limit && p.group !== 'english') best = i
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
    ru: p.ru ?? (p.group === 'english' ? undefined : ('good' as const)),
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
    kladez: { label: p.label, label_en: p.label_en, fit: fits[i], recommended: i === best, group: p.group },
  }))
}
