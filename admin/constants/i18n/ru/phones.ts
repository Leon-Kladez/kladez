import type { phonesEn } from '../en/phones.js'

export const phonesRu: Record<keyof typeof phonesEn, string> = {
  'phones.nav': 'Телефоны',
  'phones.readOnly.error': 'Изменять можно только на компьютере.',
  'phones.readOnly.bannerTitle': 'Открыто с телефона',
  'phones.readOnly.bannerText':
    'Читать, смотреть карты и спрашивать ИИ-помощника можно. Изменять можно только на компьютере.',
  'phones.validate.boolean': 'Значение должно быть «включено» или «выключено».',
  'phones.open.title': 'Открыть на телефоне',
  'phones.open.hint':
    'Наведите камеру телефона на этот квадрат и нажмите на появившуюся ссылку. Телефон должен быть подключён к тому же Wi-Fi, что и этот компьютер.',
  'phones.open.orType': 'Или наберите этот адрес в браузере телефона:',
  'phones.open.otherAddresses': 'Если не открывается, попробуйте другой адрес:',
  'phones.open.loading': 'Узнаём адрес этого компьютера…',
  'phones.open.noneTitle': 'Не удалось узнать адрес этого компьютера в домашней сети',
  'phones.open.noneText':
    'Проверьте, что компьютер подключён к Wi-Fi или к роутеру кабелем, и перезапустите «Кладезъ».',
  'phones.open.qrAlt': 'QR-код с адресом {url}',
  'phones.kind.wifi': 'Wi-Fi',
  'phones.kind.ethernet': 'Кабель',
  'phones.kind.other': 'Сеть',
  'phones.settings.intro':
    'Телефоны и планшеты в доме могут открыть «Кладезъ» по Wi-Fi: читать библиотеку, смотреть карты, спрашивать ИИ-помощника.',
  'phones.settings.accessTitle': 'Что можно с телефона',
  'phones.settings.allowLabel': 'Разрешить телефонам изменять',
  'phones.settings.allowDescription':
    'Выключено (так лучше): с телефонов можно только читать и смотреть. Включено: с любого телефона в вашем Wi-Fi можно ставить и удалять программы, скачивать и менять настройки. Включайте, только если доверяете всем, кто подключён к вашему Wi-Fi.',
  'phones.settings.saved': 'Сохранено',
  'phones.settings.saveFailed': 'Не удалось сохранить',
  'phones.settings.computerOnly': 'Этот переключатель можно менять только на компьютере.',
}
