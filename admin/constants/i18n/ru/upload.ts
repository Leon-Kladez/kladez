import type { uploadEn } from '../en/upload.js'

export const uploadRu: Record<keyof typeof uploadEn, string> = {
  'upload.failed': 'Не удалось загрузить',
  'upload.zimExists': 'Файл ZIM с таким именем уже есть',
  'upload.oneWikipedia': 'Файл Википедии можно загружать только по одному',
  'upload.zimNote': 'Только файлы ZIM. Можно загружать большие файлы (до 20 ГБ). Лучше загружать с этого же компьютера или по надёжной домашней сети. Файлы крупнее лучше скопировать прямо в папку хранилища.',
}
