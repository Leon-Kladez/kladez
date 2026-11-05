import type { serverErrorEn } from '../en/serverError.js'

export const serverErrorRu: Record<keyof typeof serverErrorEn, string> = {
  'serverError.noSpace': 'Не хватает места на диске. Освободите место и попробуйте снова.',
  'serverError.noInternet': 'Нет подключения к интернету. Подключите компьютер к сети и попробуйте снова.',
  'serverError.http': 'Не удалось скачать файл: сервер ответил ошибкой {status}.',
  'serverError.stalled': 'Скачивание остановилось: данные не приходят уже 5 минут.',
  'serverError.aborted': 'Скачивание отменено.',
  'serverError.mime': 'Этот тип файла не подходит ({type}).',
  'serverError.gated': 'Эти материалы хранятся у авторов Project NOMAD и доступны только в их официальной сборке.',
  'serverError.diskInsufficient': 'Не хватает места на диске: свободно {free}, нужно {required}.',
}
