import type { storageEn } from '../en/storage.js'

export const storageRu: Record<keyof typeof storageEn, string> = {
  'storage.title': 'Место на диске',
  'storage.selectedSuffix': '(+{size} выбрано)',
  'storage.current': 'Занято сейчас ({size})',
  'storage.selected': 'Выбрано (+{size})',
  'storage.exceeds': 'Не хватает места: нужно ещё {size}',
  'storage.remainFree': 'Останется свободно: {size}',
}
