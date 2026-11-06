import { t, type MessageKey } from '../../constants/i18n/index.js'

const KEYS: Record<string, MessageKey> = {
  productivity: 'depot.category.productivity',
  media: 'depot.category.media',
  security: 'depot.category.security',
  networking: 'depot.category.networking',
  utility: 'depot.category.utility',
  ai: 'depot.category.ai',
  education: 'depot.category.education',
  custom: 'customApp.category.custom',
}

/** Название категории приложения Склада по-русски (значение приходит с сервера: «education», «utility»…). */
export function categoryLabel(category: string): string {
  const key = KEYS[category.trim().toLowerCase()]
  if (key) return t(key)
  return category.charAt(0).toUpperCase() + category.slice(1)
}
