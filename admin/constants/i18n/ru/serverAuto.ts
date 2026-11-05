import type { serverAutoEn } from '../en/serverAuto.js'

export const serverAutoRu: Record<keyof typeof serverAutoEn, string> = {
  'serverAuto.noAppUpdates': 'Подходящих обновлений приложений нет (всё новое, идёт выдержка или только крупные версии)',
  'serverAuto.noContentUpdates': 'Подходящих обновлений материалов нет',
}
