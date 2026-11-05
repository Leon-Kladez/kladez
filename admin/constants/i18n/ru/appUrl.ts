import type { appUrlEn } from '../en/appUrl.js'

export const appUrlRu: Record<keyof typeof appUrlEn, string> = {
  'appUrl.saveFailed': 'Не удалось сохранить адрес.',
  'appUrl.title': 'Свой адрес программы',
  'appUrl.description': 'Укажите, по какому адресу открывается {app}, — это нужно, если вы заходите в программу через обратный прокси или свой DNS. Оставьте поле пустым, чтобы использовать обычный адрес ({address}).',
  'appUrl.hostPort': 'компьютер + порт',
  'appUrl.hostPortValue': 'компьютер + порт {port}',
  'appUrl.label': 'Свой адрес',
  'appUrl.invalid': 'Введите правильный адрес http(s), например https://jellyfin.myhomelab.net. Просто имя вроде «jellyfin.lan» превратится в http://jellyfin.lan.',
  'appUrl.noScheme': 'Если не указать начало адреса, мы подставим {scheme}.',
  'appUrl.opensAs': 'Будет открываться так: {link}',
  'appUrl.defaultSuffix': ' (обычный адрес)',
}
