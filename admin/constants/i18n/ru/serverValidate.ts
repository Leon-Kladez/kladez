import type { serverValidateEn } from '../en/serverValidate.js'

export const serverValidateRu: Record<keyof typeof serverValidateEn, string> = {
  'serverValidate.timeWindow': 'Время нужно указать в 24-часовом виде ЧЧ:ММ (например, «20:00»).',
  'serverValidate.cooloff': 'Выдержка — целое число часов от 0 до 8760.',
  'serverValidate.urlString': 'Адрес должен быть строкой.',
  'serverValidate.urlValid': 'Введите правильный адрес (например, «https://example.com»).',
  'serverValidate.cap': 'Ограничение — целое число байт (0 — без ограничения).',
  'serverValidate.context': 'Объём памяти разговора — «auto» или одно из значений: {values}.',
  'serverValidate.relevance': 'Строгость поиска — число от 0 до 1 или пусто (тогда берётся советуемое значение).',
  'serverValidate.style': 'Стиль ответов — одно из значений: {values}.',
  'serverValidate.keepAlive': 'Время удержания модели — например «10m», «1h» или «-1», чтобы держать модель загруженной всегда.',
  'serverValidate.gfx': 'Подмена GFX — версия вида «11.0.0», «none» или пусто (тогда берётся найденное значение).',
}
