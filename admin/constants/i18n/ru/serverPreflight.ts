import type { serverPreflightEn } from '../en/serverPreflight.js'

export const serverPreflightRu: Record<keyof typeof serverPreflightEn, string> = {
  'server.preflight.lowMemory': 'Мало памяти: свободно {available}, а этому приложению желательно не меньше {min}.',
  'server.preflight.lowDisk': 'Мало места на диске: на {mount} свободно {available}, а этому приложению желательно не меньше {min}.',
}
