// Исходный английский текст Project NOMAD — дословно. По нему сверяются обновления от авторов NOMAD.
// Словарь собран из файлов по областям в папке en/.
import { testEn } from './en/test.js'

export const en = {
  ...testEn,
} as const

export type MessageKey = keyof typeof en
