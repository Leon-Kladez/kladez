import type { conditionsEn } from '../en/conditions.js'

export const conditionsRu: Record<keyof typeof conditionsEn, string> = {
  'conditions.noDataText': 'Скачайте инструкции FDA в справочнике лекарств, чтобы увидеть подходящие средства.',
  'conditions.goDrugRef': 'Перейти в справочник лекарств',
  'conditions.noMatch': 'Безрецептурных средств при «{label}» в инструкциях не нашлось. Попробуйте поиск по названию в разделе «{link}»',
  'conditions.otc': 'Средства без рецепта',
  'conditions.results': '{count} средство|{count} средства|{count} средств',
  'conditions.remedies': '{count} средство|{count} средства|{count} средств',
  'conditions.sources': 'Источники: NCCIH «Herbs at a Glance» (NIH) и рекомендации ведомств здравоохранения США (CDC, MedlinePlus/NLM, FDA). Общественное достояние (работы правительства США).',
  'conditions.matchesNote': 'Подбор основан на показаниях из инструкций FDA, это не врачебные рекомендации. Не принимайте медицинских решений только по этим данным.',
  'conditions.evidence': 'Доказанность:',
}
