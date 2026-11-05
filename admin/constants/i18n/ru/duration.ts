import type { durationEn } from '../en/duration.js'

export const durationRu: Record<keyof typeof durationEn, string> = {
  'duration.hm': '{h} ч {m} мин',
  'duration.ms': '{m} мин {s} с',
  'duration.s': '{s} с',
}
