/**
 * «Кладезъ»: подобранные модели по надобностям — для общения, для кода, понимающие картинки — по
 * 10 в каждом разделе, от лёгких к сильным. Для каждой: потянет ли её этот компьютер и какую
 * рекомендуем (самая умная из тех, что работают «хорошо», с поправкой на процессор и видеокарту).
 *
 * Рисовать картинки и делать видео модели Ollama не умеют — «картинки» здесь значит «понимают
 * фото»: описать снимок, прочитать текст на нём, ответить на вопрос по картинке.
 */
import { MODEL_PICKS, modelFit, recommendLimit, type ModelFit } from './model_picks.js'

export type GuidePurpose = 'chat' | 'code' | 'images'

type Entry = {
  name: string
  bytes: number
  /** Сколько модель перебирает на каждое слово — по этому судим о скорости (см. model_picks.ts); по умолчанию bytes. */
  speedBytes?: number
  label: string
  label_en: string
  description: string
  description_en: string
  /** Как понимает русский: 'good' — официально; 'fair' — понимает хуже. */
  ru?: 'good' | 'fair'
  /** Сначала рассуждает, потом отвечает — не рекомендуем по умолчанию. */
  thinks?: boolean
}

const GB = 1e9

// Замер на i3-6300 без видеокарты (17.11.2026): qwen3.5:4b — 4,0 слова/с (как qwen2.5:3b), qwen3.5:9b — 1,6.
const Q35_2B = { name: 'qwen3.5:2b', bytes: 2.68 * GB, speedBytes: 1.5 * GB }
const Q35_4B = { name: 'qwen3.5:4b', bytes: 3.32 * GB, speedBytes: 2.0 * GB }
const Q35_9B = { name: 'qwen3.5:9b', bytes: 6.55 * GB, speedBytes: 5.2 * GB }
const Q35_27B = { name: 'qwen3.5:27b', bytes: 17.48 * GB }
const G4_E4B = { name: 'gemma4:e4b', bytes: 6.58 * GB }
const G4_12B = { name: 'gemma4:12b', bytes: 8.02 * GB }
const G4_31B = { name: 'gemma4:31b', bytes: 20.39 * GB }

export const MODEL_GUIDE: Record<GuidePurpose, Entry[]> = {
  chat: [
    { name: 'qwen3.5:0.8b', bytes: 1.32 * GB, speedBytes: 0.6 * GB, label: 'Самая лёгкая', label_en: 'Lightest', ru: 'good',
      description: 'Отвечает мгновенно на любом компьютере, но очень простая: короткие ответы, часто ошибается.',
      description_en: 'Answers instantly on any computer but is very simple: short answers, frequent mistakes.' },
    { ...Q35_2B, label: 'Самая быстрая', label_en: 'Fastest', ru: 'good',
      description: 'Быстрые ответы даже на слабом компьютере; для простых вопросов. Понимает фото.',
      description_en: 'Quick answers even on a weak computer; for simple questions. Understands photos.' },
    { ...Q35_4B, label: 'Быстрая и толковая', label_en: 'Fast and capable', ru: 'good',
      description: 'Лучший выбор для обычного компьютера: так же быстра, как прежние лёгкие модели, но заметно умнее.',
      description_en: 'The best choice for an ordinary computer: as fast as the old light models but noticeably smarter.' },
    { ...G4_E4B, label: 'Быстрая, от Google', label_en: 'Fast, by Google', ru: 'good',
      description: 'Gemma 4 для обычных компьютеров и ноутбуков: хорошо пишет по-русски, понимает фото.',
      description_en: 'Gemma 4 for ordinary computers and laptops: writes Russian well, understands photos.' },
    { ...Q35_9B, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Подробнее и точнее. На слабом компьютере без видеокарты — 1–3 минуты на ответ.',
      description_en: 'More detailed and accurate. 1–3 minutes per answer on a weak computer without a graphics card.' },
    { ...G4_12B, label: 'Ещё умнее', label_en: 'Even smarter', ru: 'good',
      description: 'Подробные и точные ответы, понимает картинки. Нужно 16 ГБ памяти.',
      description_en: 'Detailed, accurate answers, understands pictures. Needs 16 GB of memory.' },
    { ...Q35_27B, label: 'Очень сильная', label_en: 'Very strong', ru: 'good',
      description: 'Ответы почти как у больших онлайн-помощников. 32 ГБ памяти и видеокарта.',
      description_en: 'Answers close to large online assistants. 32 GB of memory and a graphics card.' },
    { name: 'deepseek-r1:32b', bytes: 19.85 * GB, label: 'DeepSeek: думает перед ответом', label_en: 'DeepSeek: thinks first', ru: 'fair', thinks: true,
      description: 'Сначала рассуждает, потом отвечает: сильна в задачах и логике, но ответа ждать дольше. Рассуждает всегда, даже с выключенным «Размышлением». 32 ГБ памяти и видеокарта.',
      description_en: 'Reasons first, then answers: strong at puzzles and logic, but answers take longer. 32 GB of memory and a graphics card.' },
    { ...G4_31B, label: 'Очень сильная, от Google', label_en: 'Very strong, by Google', ru: 'good',
      description: 'Самая сильная Gemma 4: длинные тексты, документы, картинки. 32–64 ГБ памяти и видеокарта.',
      description_en: 'The strongest Gemma 4: long texts, documents, pictures. 32–64 GB of memory and a graphics card.' },
    { name: 'qwen3.5:35b-a3b', bytes: 22.07 * GB, speedBytes: 3.5 * GB, label: 'Умная и быстрая', label_en: 'Smart and fast', ru: 'good',
      description: 'Устроена из «экспертов»: умная, как большая, а отвечает почти как маленькая — хорошо и без видеокарты. Нужно 32 ГБ памяти.',
      description_en: 'Built from “experts”: as smart as a big model, nearly as fast as a small one, even without a graphics card. Needs 32 GB of memory.' },
  ],
  code: [
    { name: 'qwen2.5-coder:1.5b', bytes: 0.99 * GB, label: 'Самая быстрая', label_en: 'Fastest', ru: 'good',
      description: 'Короткие функции и подсказки по коду на слабом компьютере.',
      description_en: 'Short functions and code hints on a weak computer.' },
    { name: 'qwen2.5-coder:3b', bytes: 1.93 * GB, label: 'Быстрая', label_en: 'Fast', ru: 'good',
      description: 'Пишет и дописывает код на Python, JavaScript и других языках.',
      description_en: 'Writes and completes code in Python, JavaScript and more.' },
    { ...Q35_4B, label: 'Быстрая и толковая', label_en: 'Fast and capable', ru: 'good',
      description: 'Не только для кода, но пишет и объясняет его лучше лёгких моделей для кода; объясняет по-русски.',
      description_en: 'Not code-only, but writes and explains code better than the light code models.' },
    { name: 'qwen2.5-coder:7b', bytes: 4.68 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Хороший помощник программиста: исправляет ошибки, пишет целые программы.',
      description_en: 'A good programming assistant: fixes bugs, writes whole programs.' },
    { ...Q35_9B, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Сильнее в рассуждениях: разберётся, почему программа не работает, и объяснит по-русски.',
      description_en: 'Stronger at reasoning: works out why a program fails and explains it.' },
    { name: 'deepseek-coder-v2:16b', bytes: 8.91 * GB, speedBytes: 2.0 * GB, label: 'Сильная и быстрая', label_en: 'Strong and fast', ru: 'fair',
      description: 'Устроена из «экспертов», поэтому думает быстрее, чем можно ждать по размеру. Объясняет лучше по-английски.',
      description_en: 'Built from “experts”, so it thinks faster than its size suggests. Explains better in English.' },
    { name: 'qwen2.5-coder:14b', bytes: 8.99 * GB, label: 'Сильная', label_en: 'Strong', ru: 'good',
      description: 'Сложные задачи и большие файлы. 32 ГБ памяти, лучше видеокарта.',
      description_en: 'Hard tasks and large files. 32 GB of memory, ideally a graphics card.' },
    { name: 'devstral-small-2:24b', bytes: 15.18 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'fair',
      description: 'Модель Mistral для больших проектов: разбирается в нескольких файлах сразу. 32 ГБ памяти, видеокарта.',
      description_en: 'Mistral’s model for large projects: understands several files at once. 32 GB of memory, graphics card.' },
    { name: 'qwen3-coder:30b', bytes: 18.56 * GB, speedBytes: 3.5 * GB, label: 'Очень сильная и быстрая', label_en: 'Very strong and fast', ru: 'good',
      description: 'Новое поколение Qwen для кода, из «экспертов»: быстрая и без видеокарты. Нужно 32 ГБ памяти.',
      description_en: 'The new Qwen generation for code, built from “experts”: fast even without a graphics card. Needs 32 GB of memory.' },
    { name: 'qwen2.5-coder:32b', bytes: 19.85 * GB, label: 'Самая сильная', label_en: 'Strongest', ru: 'good',
      description: 'Одна из лучших открытых моделей для кода. Рабочая станция: 64 ГБ памяти и видеокарта.',
      description_en: 'One of the best open models for code. A workstation: 64 GB of memory and a graphics card.' },
  ],
  images: [
    { ...Q35_2B, label: 'Самая быстрая', label_en: 'Fastest', ru: 'good',
      description: 'Описывает фото и читает текст на снимках даже на слабом компьютере.',
      description_en: 'Describes photos and reads text in pictures even on a weak computer.' },
    { ...Q35_4B, label: 'Быстрая и толковая', label_en: 'Fast and capable', ru: 'good',
      description: 'Описывает фото, читает документы и вывески, отвечает по-русски. Для обычного компьютера.',
      description_en: 'Describes photos, reads documents and signs. For an ordinary computer.' },
    { ...G4_E4B, label: 'Быстрая, от Google', label_en: 'Fast, by Google', ru: 'good',
      description: 'Gemma 4: понимает фото и хорошо отвечает по-русски.',
      description_en: 'Gemma 4: understands photos and answers Russian well.' },
    { name: 'qwen3-vl:8b', bytes: 6.19 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Модель Qwen специально для картинок: точно читает документы, таблицы и рукописный текст.',
      description_en: 'Qwen’s model made for pictures: reads documents, tables and handwriting accurately.' },
    { name: 'minicpm-v4.5:8b', bytes: 6.12 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'fair',
      description: 'Хорошо читает мелкий текст и разбирает несколько фото сразу. Объясняет лучше по-английски.',
      description_en: 'Good at small text and several photos at once. Explains better in English.' },
    { ...Q35_9B, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Подробно разбирает фото и документы. На слабом компьютере — медленно.',
      description_en: 'Analyses photos and documents in detail. Slow on a weak computer.' },
    { ...G4_12B, label: 'Сильная', label_en: 'Strong', ru: 'good',
      description: 'Подробно разбирает фото и отвечает по-русски. 16 ГБ памяти.',
      description_en: 'Analyses photos in detail and answers in Russian. 16 GB of memory.' },
    { ...Q35_27B, label: 'Очень сильная', label_en: 'Very strong', ru: 'good',
      description: 'Разбирает сложные документы, графики и схемы. 32 ГБ памяти, видеокарта.',
      description_en: 'Handles complex documents, charts and diagrams. 32 GB of memory, graphics card.' },
    { name: 'qwen3-vl:30b-a3b', bytes: 19.6 * GB, speedBytes: 3.5 * GB, label: 'Очень сильная и быстрая', label_en: 'Very strong and fast', ru: 'good',
      description: 'Из «экспертов»: сильная, а отвечает быстро и без видеокарты. Нужно 32 ГБ памяти.',
      description_en: 'Built from “experts”: strong yet fast, even without a graphics card. Needs 32 GB of memory.' },
    { ...G4_31B, label: 'Самая сильная', label_en: 'Strongest', ru: 'good',
      description: 'Самая сильная из понимающих картинки в этом списке. 32–64 ГБ памяти, видеокарта.',
      description_en: 'The strongest picture-understanding model in this list. 32–64 GB of memory, graphics card.' },
  ],
}

/** Скорость известной модели: speedBytes из подборок, иначе размер файла. */
export function speedBytesOf(name: string, bytes: number): number {
  for (const list of Object.values(MODEL_GUIDE)) {
    const hit = list.find((m) => m.name === name)
    if (hit) return hit.speedBytes ?? bytes
  }
  const pick = MODEL_PICKS.find((p) => p.name === name)
  return pick?.speedBytes ?? bytes
}

export type GuideItem = {
  name: string
  size: string
  bytes: number
  label: string
  description: string
  ru?: 'good' | 'fair'
  fit: ModelFit
  recommended: boolean
}

/** Оценка уже установленной модели по её размеру — та же, что у подборки (для подсказки в чате). */
export function installedFit(
  bytes: number,
  memoryBytes: number | null,
  cpus: number | null,
  gpu: boolean,
  name = ''
): ModelFit {
  const fit = modelFit(bytes, memoryBytes)
  if (fit === 'good' && !gpu && speedBytesOf(name, bytes) > recommendLimit(cpus, gpu)) return 'slow'
  return fit
}

function sizeText(bytes: number): string {
  return `${(bytes / GB).toFixed(bytes < GB ? 2 : 1)} GB`
}

/** Раздел с оценкой для этого компьютера: «хорошо», «будет медленно», «не потянет» и одна рекомендуемая. */
export function modelGuide(
  purpose: GuidePurpose,
  memoryBytes: number | null,
  cpus: number | null,
  gpu: boolean,
  en = false
): GuideItem[] {
  const list = MODEL_GUIDE[purpose]
  const limit = recommendLimit(cpus, gpu)
  const fits = list.map((m) => {
    const fit = modelFit(m.bytes, memoryBytes)
    // Помещается в память, но без видеокарты процессор не успеет — честно «будет медленно».
    if (fit === 'good' && !gpu && (m.speedBytes ?? m.bytes) > limit) return 'slow' as const
    return fit
  })
  let best = -1
  list.forEach((m, i) => {
    if (fits[i] === 'good' && (m.speedBytes ?? m.bytes) <= limit && m.ru !== 'fair' && !m.thinks) best = i
  })
  // Ни одна не «подходит»: рекомендуем самую лёгкую, что хотя бы запустится, — лучше с русским.
  if (best < 0) best = list.findIndex((m, i) => fits[i] !== 'too-big' && m.ru !== 'fair' && !m.thinks)
  if (best < 0) best = fits.findIndex((f) => f !== 'too-big')
  return list.map((m, i) => ({
    name: m.name,
    size: sizeText(m.bytes),
    bytes: m.bytes,
    label: en ? m.label_en : m.label,
    description: en ? m.description_en : m.description,
    ru: m.ru,
    fit: fits[i],
    recommended: i === best,
  }))
}
