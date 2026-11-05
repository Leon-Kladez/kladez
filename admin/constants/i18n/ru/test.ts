import type { testEn } from '../en/test.js'

export const testRu: Record<keyof typeof testEn, string> = {
  'test.files': '{count} файл|{count} файла|{count} файлов',
  'test.hello': 'Здравствуйте, {name}',
  // Намеренно пусто: проверяем, что вместо пустого перевода показывается английский текст.
  'test.untranslated': '',
}
