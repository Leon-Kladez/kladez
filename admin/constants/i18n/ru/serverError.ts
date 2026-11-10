import type { serverErrorEn } from '../en/serverError.js'

export const serverErrorRu: Record<keyof typeof serverErrorEn, string> = {
  'serverError.noSpace': 'Не хватает места на диске. Освободите место и попробуйте снова.',
  'serverError.dns': 'Не удаётся найти сервер по имени: проверьте интернет. Если включён VPN — выключите его или смените сервер.',
  'serverError.offlineCalm': 'Работаем без интернета — всё скачанное доступно.',
  'serverError.noInternet': 'Нет подключения к интернету. Подключите компьютер к сети и попробуйте снова.',
  'serverError.http': 'Не удалось скачать файл: сервер ответил ошибкой {status}.',
  'serverError.request': 'Кладезъ не смог выполнить действие (ошибка {status}). Попробуйте ещё раз; если не выйдет — перезапустите программу.',
  'serverError.stalled': 'Скачивание остановилось: данные не приходят уже 5 минут.',
  'serverError.aborted': 'Скачивание отменено.',
  'serverError.mime': 'Этот тип файла не подходит ({type}).',
  'serverError.gated': 'Эти материалы доступны только в официальной сборке исходной программы, в Кладезе их нет.',
  'serverError.diskInsufficient': 'Не хватает места на диске: свободно {free}, нужно {required}.',
}
