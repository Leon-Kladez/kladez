import type { kladezEn } from '../en/kladez.js'

export const kladezRu: Record<keyof typeof kladezEn, string> = {
  'bundles.title': 'Готовые наборы',
  'bundles.subtitle':
    'Выберите один — Википедия и подборки ниже отметятся сами. Их всё равно можно поменять вручную.',
  'bundles.pick': 'Выбрать',
  'bundles.picked': 'Выбрано',
  'bundles.size': 'около {size}',
  'bundles.status.installed': 'Установлен',
  'bundles.status.downloading': 'Скачивается',
  'bundles.status.partial': 'Установлен частично',
  'bundles.manual': 'Или выберите сами ниже',
  'bundles.notEnoughSpace': 'Не хватает места: нужно {need}, свободно {free}',
  'aiModels.ru.good': 'Хорошо понимает русский',
  'aiModels.ru.fair': 'Понимает русский',
  'aiModels.ru.goodHint': 'Разработчики модели официально заявляют русский язык',
  'aiModels.ru.fairHint': 'Работает на русском, но официально русский не заявлен',
}
