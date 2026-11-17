/**
 * «Кладезъ»: модели ИИ для «Быстрой настройки» — подобранные, а не первые три из каталога Ollama
 * (там по алфавиту выходили alfred на 24 ГБ, служебная all-minilm и athene на 30 ГБ).
 *
 * С 0.1.28 — новое поколение: Qwen 3.5 (201 язык, понимает фото), Gemma 4, DeepSeek-R1. Три ряда:
 * для обычного компьютера, для мощного (32 ГБ памяти и больше, лучше с видеокартой) и лучшие на
 * английском. Для каждой — потянет ли её этот компьютер: модели нужна память на её размер и ещё
 * около 2 ГБ на работу; Ollama в Кладезе видит память отсека WSL (по умолчанию половину памяти Windows).
 *
 * Скорость оценивается не по размеру файла, а по тому, сколько модель «перебирает» на каждое слово
 * (speedBytes): у моделей из «экспертов» (…-a3b) это малая часть размера, у Qwen 3.5 — меньше файла
 * (в файле ещё и часть для фото). Замер на i3-6300 (4 потока, без видеокарты), 17.11.2026:
 * qwen2.5:3b — 4,3 слова/с, qwen3.5:4b — 4,0, qwen3.5:9b — 1,6.
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
  /** Сколько модель перебирает на каждое слово — по этому судим о скорости; по умолчанию bytes. */
  speedBytes?: number
  group: ModelGroup
  label: string
  label_en: string
  description: string
  description_en: string
  images?: boolean
  /** Сначала «думает», потом отвечает: умнее в трудном, но ответ дольше. Не рекомендуем по умолчанию. */
  thinks?: boolean
  /** Как понимает русский: по умолчанию 'good'; у английских — 'fair' или не указан (слабо). */
  ru?: 'fair'
}

const GB = 1024 ** 3

export const MODEL_PICKS: Pick[] = [
  {
    name: 'qwen3.5:0.8b',
    size: '1.3 GB',
    bytes: 1.32e9,
    speedBytes: 0.6e9,
    group: 'home',
    label: 'Самая лёгкая',
    label_en: 'Lightest',
    description: 'Для совсем старого компьютера или нетбука: отвечает мгновенно, но очень просто и часто ошибается.',
    description_en: 'For a very old computer or netbook: answers instantly, but very simply and with frequent mistakes.',
    images: true,
  },
  {
    name: 'qwen3.5:2b',
    size: '2.7 GB',
    bytes: 2.68e9,
    speedBytes: 1.5e9,
    group: 'home',
    label: 'Самая быстрая',
    label_en: 'Fastest',
    description: 'Быстрые ответы даже на слабом компьютере, понимает фото. Для простых вопросов.',
    description_en: 'Quick answers even on a weak computer, understands photos. For simple questions.',
    images: true,
  },
  {
    name: 'qwen3.5:4b',
    size: '3.3 GB',
    bytes: 3.32e9,
    speedBytes: 2.0e9,
    group: 'home',
    label: 'Быстрая и толковая',
    label_en: 'Fast and capable',
    description: 'Лучший выбор для обычного компьютера: отвечает так же быстро, как прежние лёгкие модели, но заметно умнее. Понимает фото.',
    description_en: 'The best choice for an ordinary computer: as fast as the old light models but noticeably smarter. Understands photos.',
    images: true,
  },
  {
    name: 'qwen3.5:9b',
    size: '6.6 GB',
    bytes: 6.55e9,
    speedBytes: 5.2e9,
    group: 'home',
    label: 'Умнее',
    label_en: 'Smarter',
    description: 'Подробнее и точнее отвечает, понимает фото. На слабом компьютере без видеокарты — 1–3 минуты на ответ.',
    description_en: 'More detailed and accurate, understands photos. On a weak computer without a graphics card, 1–3 minutes per answer.',
    images: true,
  },
  {
    name: 'gemma4:12b',
    size: '8.0 GB',
    bytes: 8.02e9,
    group: 'home',
    label: 'Ещё умнее',
    label_en: 'Even smarter',
    description: 'Gemma 4 от Google: хорошо пишет по-русски, понимает фото. Нужна память от 16 ГБ; без видеокарты отвечает медленно.',
    description_en: 'Gemma 4 by Google: writes Russian well, understands photos. Needs 16 GB of memory or more; slow without a graphics card.',
    images: true,
  },
  {
    name: 'qwen3.5:35b-a3b',
    size: '22 GB',
    bytes: 22.07e9,
    speedBytes: 3.5e9,
    group: 'power',
    label: 'Умная и быстрая',
    label_en: 'Smart and fast',
    description: 'Устроена из «экспертов»: умная, как большая, а отвечает почти как маленькая — хорошо работает и без видеокарты. Нужно 32 ГБ памяти.',
    description_en: 'Built from “experts”: as smart as a big model but answers almost as fast as a small one, even without a graphics card. Needs 32 GB of memory.',
    images: true,
  },
  {
    name: 'qwen3.5:27b',
    size: '17.5 GB',
    bytes: 17.48e9,
    group: 'power',
    label: 'Очень сильная',
    label_en: 'Very strong',
    description: 'Ответы почти как у больших онлайн-помощников, понимает фото и документы. 32 ГБ памяти и видеокарта.',
    description_en: 'Answers close to large online assistants, understands photos and documents. 32 GB of memory and a graphics card.',
    images: true,
  },
  {
    name: 'deepseek-r1:32b',
    size: '19.9 GB',
    bytes: 19.85e9,
    group: 'power',
    label: 'DeepSeek: думает перед ответом',
    label_en: 'DeepSeek: thinks before answering',
    description: 'DeepSeek-R1 сначала рассуждает, потом отвечает — сильна в задачах, логике и математике, но ответа ждать дольше. Рассуждает по-английски, отвечает по-русски. 32 ГБ памяти и видеокарта.',
    description_en: 'DeepSeek-R1 reasons first, then answers: strong at puzzles, logic and maths, but answers take longer. Reasons in English. 32 GB of memory and a graphics card.',
    thinks: true,
    ru: 'fair',
  },
  // Сильнее всего на английском: русский понимают хуже (ru — 'fair' или не указан), рекомендуем не их.
  {
    name: 'llama3.1:8b',
    size: '4.9 GB',
    bytes: 4.92e9,
    group: 'english',
    label: 'Английская: обычная',
    label_en: 'English: standard',
    description: 'Llama 3.1 от Meta — одна из самых популярных моделей. Лучше всего на английском, русский понимает хуже.',
    description_en: 'Llama 3.1 by Meta, one of the most popular models. Best in English; weaker in Russian.',
    ru: 'fair',
  },
  {
    name: 'gpt-oss:20b',
    size: '13.8 GB',
    bytes: 13.79e9,
    speedBytes: 3e9,
    group: 'english',
    label: 'Английская: рассуждения',
    label_en: 'English: reasoning',
    description: 'gpt-oss от OpenAI — сильна в логике и задачах; устроена из «экспертов», поэтому быстрее, чем можно ждать по размеру. Лучше всего на английском.',
    description_en: 'gpt-oss by OpenAI, strong at logic and problem solving; built from “experts”, so faster than its size suggests. Best in English.',
    thinks: true,
    ru: 'fair',
  },
  {
    name: 'llama3.3:70b',
    size: '42.5 GB',
    bytes: 42.52e9,
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
 * Насколько «тяжёлую» модель рекомендовать (по speedBytes): без видеокарты модель думает процессором —
 * на слабом (4 потока и меньше) до ~2 ГБ (qwen3.5:4b), на обычном — до 5 ГБ, на мощном (12+ потоков) —
 * до 10 ГБ; с видеокартой — до 20 ГБ.
 */
export function recommendLimit(cpus: number | null, gpu: boolean): number {
  if (gpu) return 20 * GB
  if (cpus !== null && cpus <= 4) return 2 * GB
  if (cpus !== null && cpus >= 12) return 10 * GB
  return 5 * GB
}

/** Список для «Быстрой настройки»: рекомендуется самая умная из тех, что работают «хорошо» и успевают отвечать. */
export function modelPicks(memoryBytes: number | null, cpus: number | null = null, gpu = false): ModelPick[] {
  const fits = MODEL_PICKS.map((p) => modelFit(p.bytes, memoryBytes))
  const limit = recommendLimit(cpus, gpu)
  let best = -1
  MODEL_PICKS.forEach((p, i) => {
    if (fits[i] === 'good' && (p.speedBytes ?? p.bytes) <= limit && p.group !== 'english' && !p.thinks) best = i
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
        thinking: p.thinks ?? false,
      },
    ],
    kladez: { label: p.label, label_en: p.label_en, fit: fits[i], recommended: i === best, group: p.group },
  }))
}
