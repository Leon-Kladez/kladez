// Исходный английский текст Project NOMAD — дословно. По нему сверяются обновления от авторов NOMAD.
// Словарь собран из файлов по областям в папке en/.
import { testEn } from './en/test.js'
import { commonEn } from './en/common.js'

export const en = {
  ...testEn,
  ...commonEn,
} as const

export type MessageKey = keyof typeof en
