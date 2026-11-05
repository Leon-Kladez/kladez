import type { safetyEn } from '../en/safety.js'

export const safetyRu: Record<keyof typeof safetyEn, string> = {
  'safety.banner.title': 'Только для справки — это не медицинский совет.',
  'safety.banner.matches': 'Здесь показания из инструкций FDA сопоставлены с вашей ситуацией. Это {notRec} и {notFda}.',
  'safety.banner.notRecommendation': 'не рекомендация',
  'safety.banner.notEndorsement': 'не одобрение FDA',
  'safety.banner.notChecker': 'Это {strong}. Читайте все предупреждения в инструкции и советуйтесь с фармацевтом или врачом, прежде чем сочетать лекарства.',
  'safety.banner.emergency': 'В экстренном случае или при тяжёлом либо ухудшающемся состоянии — {strong}.',
  'safety.remedy.title': 'Только для справки — это не медицинский совет.',
  'safety.remedy.body': 'Польза этих средств доказана слабо или спорно, FDA их не проверяла, и они не заменяют помощь медика. Посоветуйтесь с врачом, прежде чем применять их или сочетать с лекарствами, которые вы уже принимаете.',
  'safety.remedy.emergencyStrong': 'обратитесь за настоящей медицинской помощью — вызовите скорую (103 или 112)',
}
