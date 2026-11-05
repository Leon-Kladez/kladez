import type { kbPolicyEn } from '../en/kbPolicy.js'

export const kbPolicyRu: Record<keyof typeof kbPolicyEn, string> = {
  'kbPolicy.indexingStarted': '{name} подготовит ваши материалы. Ход работы виден в разделе «База знаний».',
  'kbPolicy.indexingFailed': 'Не удалось начать подготовку. Попробуйте снова в разделе «База знаний».',
  'kbPolicy.later': 'Пока материалы не будут подготовлены. Включить это можно в любой момент в разделе «База знаний».',
  'kbPolicy.saveFailed': 'Не удалось сохранить выбор. Попробуйте снова.',
  'kbPolicy.question': 'Подготовить {n} ваш файл для {name}?|Подготовить {n} ваших файла для {name}?|Подготовить {n} ваших файлов для {name}?',
  'kbPolicy.explain': 'После этого {name} сможет искать в них ответы на ваши вопросы.',
  'kbPolicy.indexExisting': 'Подготовить материалы',
  'kbPolicy.maybeLater': 'Позже',
}
