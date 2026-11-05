import type { collectionsEn } from '../en/collections.js'

export const collectionsRu: Record<keyof typeof collectionsEn, string> = {
  'collections.renamed': 'Раздел переименован.',
  'collections.renameFailed': 'Не удалось переименовать раздел.',
  'collections.removed': 'Раздел убран.',
  'collections.removeFailed': 'Не удалось убрать раздел.',
  'collections.manage': 'Разделы',
  'collections.intro': 'Переименуйте или уберите разделы. Если убрать раздел, файлы не удалятся — они перейдут в «Без раздела», и их можно разложить заново.',
  'collections.none': 'Разделов пока нет. Чтобы создать раздел, укажите его у файла в таблице базы знаний.',
  'collections.removeQuestion': 'Убрать «{name}»? Файлы перейдут в «Без раздела».',
  'collections.rename': 'Переименовать',
}
