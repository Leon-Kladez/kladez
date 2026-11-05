import { en, t, type MessageKey } from '../../constants/i18n/index.js'

type LocalizableService = {
  service_name: string
  friendly_name: string | null
  description: string | null
}

/**
 * Название и описание приложения Склада — по-русски.
 * Перевод подставляется, только если в базе лежит исходный английский текст NOMAD
 * (из каталога или начального заполнения). Если пользователь переименовал приложение
 * или описал его своими словами, его текст показывается как есть.
 */
export function localizeService<T extends LocalizableService>(service: T): T {
  return {
    ...service,
    friendly_name: localizeField(service.service_name, 'title', service.friendly_name),
    description: localizeField(service.service_name, 'description', service.description),
  }
}

function localizeField(serviceName: string, field: 'title' | 'description', value: string | null) {
  if (!value) return value
  const key = `services.${serviceName}.${field}` as MessageKey
  if (!(key in en)) return value
  return value.trim() === en[key] ? t(key) : value
}
