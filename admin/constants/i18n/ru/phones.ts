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
  'phones.settings.autostartTitle': 'Запуск вместе с Windows',
  'phones.settings.autostartLabel': 'Запускать Кладезъ вместе с Windows',
  'phones.settings.autostartDescription': 'Включено: Кладезъ поднимается при входе в Windows — открывается сразу, и телефоны могут открыть его в любой момент; занимает около 2 ГБ памяти. Выключено: память свободна, а Кладезъ запускается ярлыком на рабочем столе — первое открытие займёт около минуты.',
  'phones.settings.saved': 'Сохранено',
  'phones.settings.saveFailed': 'Не удалось сохранить',
  'phones.settings.computerOnly': 'Этот переключатель можно менять только на компьютере.',
  'phones.travel.title': 'Карты в дорогу на телефон',
  'phones.travel.intro':
    'Organic Maps — бесплатный навигатор: скачайте страны в телефон, и он ведёт по GPS без интернета — на машине, пешком и на велосипеде. Без рекламы и слежки. Кладезъ даёт приложение для Android телефонам в доме прямо с этого компьютера, без магазина приложений.',
  'phones.travel.prepare': 'Подготовить приложение для телефонов',
  'phones.travel.prepareNote': 'Около 66 МБ, скачивается один раз, пока есть интернет.',
  'phones.travel.downloading': 'Скачиваю приложение… {pct} %',
  'phones.travel.errorNetwork': 'Нет связи с интернетом — подготовьте приложение, когда интернет появится.',
  'phones.travel.errorFailed': 'Не удалось скачать приложение. Попробуйте ещё раз.',
  'phones.travel.notReadyPhone': 'Приложение ещё не подготовлено — сделайте это на компьютере: Настройки → Телефоны.',
  'phones.travel.scan':
    'Наведите камеру телефона на этот квадрат и нажмите на ссылку — скачается приложение. Откройте файл и разрешите установку.',
  'phones.travel.onPhone': 'Скачать приложение на этот телефон',
  'phones.travel.ready': 'Organic Maps {version}, {size}',
  'phones.travel.update': 'Проверить новую версию',
  'phones.travel.iphone': 'iPhone: поставьте «Organic Maps» из App Store.',
  'phones.travel.help': 'Как пользоваться в дороге',
}
