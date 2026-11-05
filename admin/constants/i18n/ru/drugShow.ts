import type { drugShowEn } from '../en/drugShow.js'

export const drugShowRu: Record<keyof typeof drugShowEn, string> = {
  'drugShow.title': 'Лекарство',
  'drugShow.addCompare': 'Добавить к сравнению',
  'drugShow.manufacturer': 'Производитель: ',
  'drugShow.route': 'Способ приёма: ',
  'drugShow.ndc': 'Код NDC: ',
  'drugShow.labelDate': 'Дата инструкции: ',
  'drugShow.boxed': 'Особое предупреждение',
  'drugShow.indications': 'Показания',
  'drugShow.commonlyFor': 'Обычно применяют при',
  'drugShow.dosage': 'Дозировка и применение',
  'drugShow.warnings': 'Предупреждения',
  'drugShow.interactions': 'Взаимодействие с лекарствами',
  'drugShow.contraindications': 'Противопоказания',
  'drugShow.whenUsing': 'Во время применения',
  'drugShow.stopUse': 'Когда прекратить приём',
  'drugShow.doNotRely': 'Не принимайте медицинских решений только по этим данным. Мы стараемся, чтобы всё было точно, но считайте сведения непроверенными.',
  'drugShow.refreshed': 'Обновлено: {date}',
}
