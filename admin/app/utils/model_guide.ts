/**
 * «Кладезъ»: подобранные модели по надобностям — для общения, для кода, понимающие картинки — по
 * 10 в каждом разделе, от лёгких к сильным. Для каждой: потянет ли её этот компьютер и какую
 * рекомендуем (самая умная из тех, что работают «хорошо», с поправкой на процессор и видеокарту).
 *
 * Рисовать картинки и делать видео модели Ollama не умеют — «картинки» здесь значит «понимают
 * фото»: описать снимок, прочитать текст на нём, ответить на вопрос по картинке.
 */
import { modelFit, recommendLimit, type ModelFit } from './model_picks.js'

export type GuidePurpose = 'chat' | 'code' | 'images'

type Entry = {
  name: string
  bytes: number
  label: string
  label_en: string
  description: string
  description_en: string
  /** Как понимает русский: 'good' — официально; 'fair' — понимает хуже. */
  ru?: 'good' | 'fair'
  /** Смесь экспертов: думает быстрее, чем можно ждать по размеру. */
  fastForSize?: boolean
}

const GB = 1e9

export const MODEL_GUIDE: Record<GuidePurpose, Entry[]> = {
  chat: [
    { name: 'qwen2.5:0.5b', bytes: 0.4 * GB, label: 'Самая лёгкая', label_en: 'Lightest', ru: 'good',
      description: 'Отвечает мгновенно на любом компьютере, но очень простая: короткие ответы, часто ошибается.',
      description_en: 'Answers instantly on any computer but is very simple: short answers, frequent mistakes.' },
    { name: 'qwen2.5:1.5b', bytes: 0.99 * GB, label: 'Самая быстрая', label_en: 'Fastest', ru: 'good',
      description: 'Быстрые ответы даже на слабом компьютере; для простых вопросов.',
      description_en: 'Quick answers even on a weak computer; for simple questions.' },
    { name: 'qwen2.5:3b', bytes: 1.93 * GB, label: 'Быстрая', label_en: 'Fast', ru: 'good',
      description: 'Хороший выбор для обычного компьютера: понимает русский, отвечает быстро.',
      description_en: 'A good choice for an ordinary computer: understands Russian, answers quickly.' },
    { name: 'gemma3:4b', bytes: 3.35 * GB, label: 'Быстрая, с картинками', label_en: 'Fast, with pictures', ru: 'good',
      description: 'Чуть умнее 3B и понимает фото. Хорошо пишет по-русски.',
      description_en: 'A bit smarter than 3B and understands photos. Writes Russian well.' },
    { name: 'qwen2.5:7b', bytes: 4.68 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Заметно лучше рассуждает и пишет. Без видеокарты — 10–30 секунд на ответ.',
      description_en: 'Noticeably better at reasoning and writing. 10–30 seconds per answer without a graphics card.' },
    { name: 'gemma3:12b', bytes: 8.1 * GB, label: 'Ещё умнее', label_en: 'Even smarter', ru: 'good',
      description: 'Подробные и точные ответы, понимает картинки. Нужно 16 ГБ памяти.',
      description_en: 'Detailed, accurate answers, understands pictures. Needs 16 GB of memory.' },
    { name: 'qwen2.5:14b', bytes: 8.99 * GB, label: 'Сильная', label_en: 'Strong', ru: 'good',
      description: 'Хорошо рассуждает и считает. Для компьютера с 32 ГБ памяти, лучше с видеокартой.',
      description_en: 'Good at reasoning and maths. For a computer with 32 GB of memory, ideally a graphics card.' },
    { name: 'gemma3:27b', bytes: 17.4 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'good',
      description: 'Ответы почти как у больших онлайн-помощников, понимает картинки. 32–64 ГБ памяти, видеокарта.',
      description_en: 'Answers close to large online assistants, understands pictures. 32–64 GB of memory, graphics card.' },
    { name: 'qwen2.5:32b', bytes: 19.85 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'good',
      description: 'Сильна в рассуждениях и длинных текстах. 32–64 ГБ памяти, видеокарта.',
      description_en: 'Strong at reasoning and long texts. 32–64 GB of memory, graphics card.' },
    { name: 'qwen2.5:72b', bytes: 47.4 * GB, label: 'Самая сильная', label_en: 'Strongest', ru: 'good',
      description: 'Самая умная из тех, что работают без интернета. Рабочая станция: 64+ ГБ памяти и мощная видеокарта.',
      description_en: 'The smartest that works offline. A workstation: 64+ GB of memory and a powerful graphics card.' },
  ],
  code: [
    { name: 'qwen2.5-coder:0.5b', bytes: 0.4 * GB, label: 'Самая лёгкая', label_en: 'Lightest', ru: 'good',
      description: 'Дописывает простые строки кода; для объяснений слабовата.',
      description_en: 'Completes simple lines of code; weak at explanations.' },
    { name: 'qwen2.5-coder:1.5b', bytes: 0.99 * GB, label: 'Самая быстрая', label_en: 'Fastest', ru: 'good',
      description: 'Короткие функции и подсказки по коду на слабом компьютере.',
      description_en: 'Short functions and code hints on a weak computer.' },
    { name: 'qwen2.5-coder:3b', bytes: 1.93 * GB, label: 'Быстрая', label_en: 'Fast', ru: 'good',
      description: 'Пишет и объясняет код на Python, JavaScript и других языках; для обычного компьютера.',
      description_en: 'Writes and explains code in Python, JavaScript and more; for an ordinary computer.' },
    { name: 'qwen2.5-coder:7b', bytes: 4.68 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Хороший помощник программиста: исправляет ошибки, пишет целые программы.',
      description_en: 'A good programming assistant: fixes bugs, writes whole programs.' },
    { name: 'codegemma:7b', bytes: 5.01 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'fair',
      description: 'Модель Google для кода. Объясняет лучше по-английски.',
      description_en: 'Google’s model for code. Explains better in English.' },
    { name: 'qwen2.5-coder:14b', bytes: 8.99 * GB, label: 'Сильная', label_en: 'Strong', ru: 'good',
      description: 'Сложные задачи и большие файлы. 32 ГБ памяти, лучше видеокарта.',
      description_en: 'Hard tasks and large files. 32 GB of memory, ideally a graphics card.' },
    { name: 'deepseek-coder-v2:16b', bytes: 8.91 * GB, label: 'Сильная и быстрая', label_en: 'Strong and fast', ru: 'fair', fastForSize: true,
      description: 'Устроена из «экспертов», поэтому думает быстрее, чем можно ждать по размеру. Объясняет лучше по-английски.',
      description_en: 'Built from “experts”, so it thinks faster than its size suggests. Explains better in English.' },
    { name: 'codestral:22b', bytes: 12.57 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'fair',
      description: 'Модель Mistral для кода, 80+ языков программирования. 32 ГБ памяти, видеокарта.',
      description_en: 'Mistral’s model for code, 80+ programming languages. 32 GB of memory, graphics card.' },
    { name: 'devstral:24b', bytes: 14.33 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'fair',
      description: 'Для больших проектов: разбирается в нескольких файлах сразу. 32–64 ГБ памяти, видеокарта.',
      description_en: 'For large projects: understands several files at once. 32–64 GB of memory, graphics card.' },
    { name: 'qwen2.5-coder:32b', bytes: 19.85 * GB, label: 'Самая сильная', label_en: 'Strongest', ru: 'good',
      description: 'Лучшая из открытых моделей для кода. Рабочая станция: 64 ГБ памяти и видеокарта.',
      description_en: 'The best open model for code. A workstation: 64 GB of memory and a graphics card.' },
  ],
  images: [
    { name: 'moondream:1.8b', bytes: 1.74 * GB, label: 'Самая лёгкая', label_en: 'Lightest', ru: 'fair',
      description: 'Коротко описывает фото; отвечает по-английски.',
      description_en: 'Briefly describes photos; answers in English.' },
    { name: 'qwen2.5vl:3b', bytes: 3.2 * GB, label: 'Быстрая', label_en: 'Fast', ru: 'good',
      description: 'Описывает фото и читает текст на снимках, документах, вывесках. Понимает русский.',
      description_en: 'Describes photos and reads text in pictures, documents and signs. Understands Russian.' },
    { name: 'gemma3:4b', bytes: 3.35 * GB, label: 'Быстрая', label_en: 'Fast', ru: 'good',
      description: 'Понимает фото и хорошо отвечает по-русски; годится и для обычного разговора.',
      description_en: 'Understands photos and answers Russian well; also fine for ordinary chat.' },
    { name: 'minicpm-v:8b', bytes: 5.47 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'fair',
      description: 'Хорошо читает мелкий текст и таблицы на снимках.',
      description_en: 'Good at reading small text and tables in pictures.' },
    { name: 'qwen2.5vl:7b', bytes: 5.97 * GB, label: 'Умнее', label_en: 'Smarter', ru: 'good',
      description: 'Точно описывает фото, читает документы и рукописный текст.',
      description_en: 'Describes photos accurately, reads documents and handwriting.' },
    { name: 'llama3.2-vision:11b', bytes: 7.82 * GB, label: 'Сильная', label_en: 'Strong', ru: 'fair',
      description: 'Модель Meta для фото. Лучше всего по-английски. 16 ГБ памяти.',
      description_en: 'Meta’s model for photos. Best in English. 16 GB of memory.' },
    { name: 'gemma3:12b', bytes: 8.1 * GB, label: 'Сильная', label_en: 'Strong', ru: 'good',
      description: 'Подробно разбирает фото и отвечает по-русски. 16 ГБ памяти.',
      description_en: 'Analyses photos in detail and answers in Russian. 16 GB of memory.' },
    { name: 'gemma3:27b', bytes: 17.4 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'good',
      description: 'Почти как большие онлайн-помощники. 32–64 ГБ памяти, видеокарта.',
      description_en: 'Close to large online assistants. 32–64 GB of memory, graphics card.' },
    { name: 'qwen2.5vl:32b', bytes: 21.16 * GB, label: 'Очень сильная', label_en: 'Very strong', ru: 'good',
      description: 'Разбирает сложные документы, графики и схемы. 32–64 ГБ памяти, видеокарта.',
      description_en: 'Handles complex documents, charts and diagrams. 32–64 GB of memory, graphics card.' },
    { name: 'qwen2.5vl:72b', bytes: 48.71 * GB, label: 'Самая сильная', label_en: 'Strongest', ru: 'good',
      description: 'Самая сильная из понимающих картинки. Рабочая станция: 64+ ГБ памяти, мощная видеокарта.',
      description_en: 'The strongest of the picture-understanding models. A workstation: 64+ GB of memory, powerful graphics card.' },
  ],
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
export function installedFit(bytes: number, memoryBytes: number | null, cpus: number | null, gpu: boolean): ModelFit {
  const fit = modelFit(bytes, memoryBytes)
  if (fit === 'good' && !gpu && bytes > recommendLimit(cpus, gpu)) return 'slow'
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
    if (fit === 'good' && !gpu && m.bytes > limit * (m.fastForSize ? 2 : 1)) return 'slow' as const
    return fit
  })
  let best = -1
  list.forEach((m, i) => {
    if (fits[i] === 'good' && m.bytes <= limit * (m.fastForSize ? 2 : 1) && m.ru !== 'fair') best = i
  })
  // Ни одна не «подходит»: рекомендуем самую лёгкую, что хотя бы запустится, — лучше с русским.
  if (best < 0) best = list.findIndex((m, i) => fits[i] !== 'too-big' && m.ru !== 'fair')
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
