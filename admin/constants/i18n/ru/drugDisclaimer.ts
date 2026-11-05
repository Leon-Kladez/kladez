import type { drugDisclaimerEn } from '../en/drugDisclaimer.js'

export const drugDisclaimerRu: Record<keyof typeof drugDisclaimerEn, string> = {
  'drugDisclaimer.title': 'Прежде чем пользоваться справочником лекарств',
  'drugDisclaimer.intro': 'Справочник показывает общие сведения из официальных {labels} и подбирает безрецептурные средства по признакам. Он нужен {infoOnly}.',
  'drugDisclaimer.labels': 'инструкций к лекарствам FDA (США)',
  'drugDisclaimer.infoOnly': 'только для справки',
  'drugDisclaimer.notAdvice': 'Это {strong} и не замена врачу, фармацевту или медсестре.',
  'drugDisclaimer.notAdviceStrong': 'не медицинский совет',
  'drugDisclaimer.notChecker': 'Это {strong}. Всегда читайте полную инструкцию каждого средства и советуйтесь со специалистом, прежде чем сочетать лекарства.',
  'drugDisclaimer.notCheckerStrong': 'не проверка совместимости лекарств',
  'drugDisclaimer.matches': 'Подбор по признакам основан на тексте инструкций, а не на врачебных рекомендациях, — он может быть неполным или показать неожиданные средства.',
  'drugDisclaimer.followLabel': 'Всегда следуйте инструкции {strong}: дозировки и предупреждения у разных средств отличаются.',
  'drugDisclaimer.followLabelStrong': 'того средства, которое у вас на руках',
  'drugDisclaimer.emergency': 'В экстренном случае, при тяжёлом или ухудшающемся состоянии или если сомневаетесь — {strong}.',
  'drugDisclaimer.emergencyStrong': 'обратитесь к медику или вызовите скорую (103 или 112)',
  'drugDisclaimer.source': 'Данные — из openFDA (FDA США, общественное достояние). Кладезъ не связан с FDA и не одобрен ею.',
  'drugDisclaimer.continue': 'Понятно — продолжить',
}
