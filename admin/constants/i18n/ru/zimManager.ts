import type { zimManagerEn } from '../en/zimManager.js'

export const zimManagerRu: Record<keyof typeof zimManagerEn, string> = {
  'zimManager.confirmDelete': 'Удалить?',
  'zimManager.deleteQuestion': 'Точно удалить {name}? Отменить это будет нельзя.',
  'zimManager.books': '{count} книга|{count} книги|{count} книг',
  'zimManager.foundNew': 'Найдено новых: {found}. Теперь в Библиотеке {total}.',
  'zimManager.upToDate': 'Библиотека в порядке ({total}).',
  'zimManager.subtitle': 'Файлы материалов, которые хранятся на компьютере.',
  'zimManager.hideUploader': 'Скрыть загрузку',
  'zimManager.upload': 'Загрузить файл ZIM',
  'zimManager.rescanHint': 'Заново собрать список Библиотеки по файлам на диске. Нужно, если вы сами скопировали файлы ZIM в папку.',
  'zimManager.rescan': 'Обновить список',
  'zimManager.uploadHint': 'Загрузите файл ZIM через браузер. Можно до 20 ГБ. Лучше загружать с этого же компьютера или по надёжной домашней сети. Файлы крупнее лучше скопировать прямо в папку хранилища.',
  'zimManager.uploadAdded': 'Загрузка завершена. В Библиотеку добавлено: {books}.',
  'zimManager.uploadUpToDate': 'Загрузка завершена. Библиотека в порядке.',
  'zimManager.kiwixMissing': 'Программа Kiwix не установлена. Установите её, чтобы открывать скачанные файлы ZIM',
  'zimManager.summary': 'Описание',
  'zimManager.actions': 'Действия',
}
