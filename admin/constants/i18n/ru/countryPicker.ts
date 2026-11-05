import type { countryPickerEn } from '../en/countryPicker.js'

export const countryPickerRu: Record<keyof typeof countryPickerEn, string> = {
  'countryPicker.title': 'Скачать карту страны или региона',
  'countryPicker.start': 'Начать скачивание',
  'countryPicker.search': 'Поиск среди {count} страны|Поиск среди {count} стран|Поиск среди {count} стран',
  'countryPicker.clearAll': 'Снять все',
  'countryPicker.quickPicks': 'Быстрый выбор',
  'countryPicker.noMatch': 'Нет стран по запросу «{search}».',
  'countryPicker.installedHint': 'Уже скачана — выберите снова, чтобы скачать с другим масштабом',
  'countryPicker.selected': 'Выбрана {count}|Выбрано {count}|Выбрано {count}',
  'countryPicker.remove': 'Убрать: {name}',
  'countryPicker.maxZoom': 'Наибольший масштаб: {zoom}',
  'countryPicker.zoomWorld': 'z{z} (весь мир)',
  'countryPicker.zoomStreet': 'z{z} (улицы)',
  'countryPicker.zoomHint': 'Меньше масштаб — меньше файл и меньше подробностей. На 15 видны отдельные улицы, на 10 — города целиком.',
  'countryPicker.estimating': 'Считаем размер…',
  'countryPicker.tiles': '{n} фрагмент, ~{size}|{n} фрагмента, ~{size}|{n} фрагментов, ~{size}',
  'countryPicker.sourceBuild': '(данные от {date})',
  'countryPicker.pickOne': 'Выберите хотя бы одну страну, чтобы узнать размер.',
  'countryPicker.estimateFailed': 'Не удалось посчитать размер',
  'countryPicker.pickBeforeDownload': 'Выберите хотя бы одну страну.',
  'countryPicker.stillEstimating': 'Ещё считаем размер — подождите немного.',
}
