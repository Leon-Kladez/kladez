import type { categoryEn } from '../en/category.js'

export const categoryRu: Record<keyof typeof categoryEn, string> = {
  'category.indexingSuffix': ' (индексируется)',
  'category.downloadingSuffix': ' (скачивается)',
  'category.tiersAvailable': 'Доступно {count} уровень|Доступно {count} уровня|Доступно {count} уровней',
  'category.clickToChoose': ' — нажмите, чтобы выбрать',
  'category.sizeRange': 'Размер: {min} — {max}',
}
