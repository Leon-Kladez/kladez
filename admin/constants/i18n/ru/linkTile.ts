import type { linkTileEn } from '../en/linkTile.js'

export const linkTileRu: Record<keyof typeof linkTileEn, string> = {
  'linkTile.saveFailed': 'Не удалось сохранить ссылку.',
  'linkTile.addFailed': 'Не удалось добавить ссылку. Возможно, ссылка с таким названием уже есть.',
  'linkTile.editTitle': 'Изменить ссылку',
  'linkTile.addTitle': 'Добавить ссылку',
  'linkTile.add': 'Добавить',
  'linkTile.intro': 'Добавьте ярлык на то, что у вас уже работает — на этом компьютере или где-то в вашей сети. Кладезъ этим не управляет, просто ставит кнопку на главную.',
  'linkTile.name': 'Название',
  'linkTile.namePlaceholder': 'Хранилище в гостиной',
  'linkTile.invalid': 'Введите правильный адрес, например 192.168.1.50:8080 или https://nas.local.',
  'linkTile.opensAs': 'Будет открываться так:',
  'linkTile.notSet': 'пока не задано',
  'linkTile.description': 'Описание (необязательно)',
  'linkTile.descriptionPlaceholder': 'Фото и резервные копии',
  'linkTile.icon': 'Значок',
  'linkTile.color': 'Цвет',
  'linkTile.colorHint': 'Ссылки всегда показываются контуром, а не заливкой, — так их легко отличить от приложений, которыми управляет Кладезъ.',
}
