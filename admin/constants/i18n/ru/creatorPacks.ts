import type { creatorPacksEn } from '../en/creatorPacks.js'

export const creatorPacksRu: Record<keyof typeof creatorPacksEn, string> = {
  'creatorPacks.videoCount': '{count} видео|{count} видео|{count} видео',
  'creatorPacks.uninstall': 'Удалить набор',
  'creatorPacks.installStarted': 'Установка «{name}» началась',
  'creatorPacks.installError': 'Не удалось начать установку.',
  'creatorPacks.uninstalled': '«{name}» удалён',
  'creatorPacks.uninstallError': 'Не удалось удалить.',
  'creatorPacks.subtitle': 'Подборки видео от авторов — смотреть без интернета',
  'creatorPacks.none': 'Наборов авторов пока нет.',
  'creatorPacks.installTitle': 'Установить «{name}»?',
  'creatorPacks.installTitleGeneric': 'Установить набор автора',
  'creatorPacks.update': 'Обновить набор',
  'creatorPacks.install': 'Установить набор',
  'creatorPacks.installBody': '{videos} от автора {creator}, примерно {size}. Набор скачается в фоне и появится в Kiwix, когда будет готов.',
  'creatorPacks.licensed': 'Материалы под лицензией: только для себя, распространять нельзя.',
  'creatorPacks.viewLicense': 'Лицензия',
  'creatorPacks.uninstallTitle': 'Удалить «{name}»?',
  'creatorPacks.uninstallTitleGeneric': 'Удалить набор автора',
  'creatorPacks.uninstallBody': 'Скачанные видео ({size}) будут удалены с этого компьютера. Набор можно установить снова в любое время.',
}
