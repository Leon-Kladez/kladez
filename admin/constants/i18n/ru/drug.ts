import type { drugEn } from '../en/drug.js'

export const drugRu: Record<keyof typeof drugEn, string> = {
  'drug.removeFromComparison': 'Убрать {name} из сравнения',
  'drug.noInteractionText': 'В этой инструкции нет раздела о взаимодействии.',
  'drug.products': '{count} средство|{count} средства|{count} средств',
  'drug.labels': '{count} инструкция|{count} инструкции|{count} инструкций',
  'drug.unknown': 'Неизвестное средство',
}
