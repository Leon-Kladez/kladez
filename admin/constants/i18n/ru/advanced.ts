import type { advancedEn } from '../en/advanced.js'

export const advancedRu: Record<keyof typeof advancedEn, string> = {
  'advanced.saved': 'Настройка сохранена.',
  'advanced.subtitle': 'Дополнительные настройки для опытных. Менять их не обязательно — обычные значения подходят почти всем.',
  'advanced.connectivity': 'Подключение к интернету',
  'advanced.connectivityText': 'Кладезъ время от времени проверяет, есть ли интернет. Обычно он обращается к служебному адресу Cloudflare и нескольким запасным. Если ваша сеть их блокирует, укажите свой адрес ниже. Оставьте пустым, чтобы использовать встроенные.',
  'advanced.envTitle': 'Задано переменной окружения',
  'advanced.envMessage': 'Задана переменная окружения INTERNET_STATUS_TEST_URL, и она главнее этой настройки. Уберите её, чтобы менять адрес здесь.',
  'advanced.testUrl': 'Адрес для проверки интернета',
  'advanced.testUrlHelp': 'Один адрес http(s) для проверки связи. Любой ответ сервера означает, что интернет есть.',
  'advanced.urlScheme': 'Адрес должен начинаться с http или https.',
}
