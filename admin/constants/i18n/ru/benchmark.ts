import type { benchmarkEn } from '../en/benchmark.js'

export const benchmarkRu: Record<keyof typeof benchmarkEn, string> = {
  'benchmark.score.system': 'Оценка системы',
  'benchmark.score.ai': 'Оценка ИИ',
  'benchmark.score.nomad': 'Общая оценка',
  'benchmark.score.partialCta': 'Это частичный результат, а не общая оценка. Чтобы получить общую оценку, запустите полную проверку.',
  'benchmark.alreadySubmitted': 'Этот результат уже отправлен в общую таблицу',
  'benchmark.submitFailed': 'Не удалось отправить результат',
}
