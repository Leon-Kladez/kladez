// Кладезъ: что показать в подсказке о месте на карте — по объектам карты под курсором/пальцем.
// Чистая логика (без карты), чтобы её можно было проверить тестом.
import { formatHouseNumber, placeKindName } from '../../constants/map_places.js'
import type { Locale } from '../../constants/i18n/index.js'

/** Объект карты под точкой: id слоя-шаблона (без «-регион») и свойства. */
export type PlaceFeature = {
  layer: string
  properties: Record<string, unknown>
}

export type PlaceInfo = {
  /** Название («Ригла») или, если его нет, вид места / «Дом 5». */
  title: string
  /** Вид места («Аптека»), если не совпадает с заголовком. */
  kind: string | null
  /** Номер дома, если известен. */
  house: string | null
  /** Ближайшая улица. */
  street: string | null
}

const POI_LAYERS = new Set(['kz_places', 'pois'])
const HOUSE_LAYERS = new Set(['address_label', 'buildings'])

function nameOf(p: Record<string, unknown>, locale: Locale): string | null {
  const keys = locale === 'en' ? ['name:en', 'name', 'name:ru'] : ['name:ru', 'name', 'name:en']
  for (const k of keys) {
    const v = p[k]
    if (typeof v === 'string' && v.trim()) return v.trim()
  }
  return null
}

/** Шаблонное имя слоя: «kz_places-ru-central» → «kz_places». */
export function templateLayerId(styleLayerId: string): string {
  const i = styleLayerId.indexOf('-')
  return i === -1 ? styleLayerId : styleLayerId.slice(0, i)
}

/**
 * features — под точкой (сверху вниз, как отдаёт карта); roads — улицы рядом.
 * null — показывать нечего (пустое место: дальше как раньше — новая метка).
 */
export function describePlace(
  features: PlaceFeature[],
  roads: PlaceFeature[],
  locale: Locale,
  houseWord: string
): PlaceInfo | null {
  const poi = features.find((f) => POI_LAYERS.has(f.layer) && (nameOf(f.properties, locale) || placeKindName(f.properties.kind, locale)))
  const houseFeature = features.find(
    (f) => HOUSE_LAYERS.has(f.layer) && formatHouseNumber(f.properties.addr_housenumber)
  )
  const house = houseFeature ? formatHouseNumber(houseFeature.properties.addr_housenumber) : null
  const streetFeature = roads.find((f) => nameOf(f.properties, locale))
  const street = streetFeature ? nameOf(streetFeature.properties, locale) : null

  if (poi) {
    const name = nameOf(poi.properties, locale)
    const kind = placeKindName(poi.properties.kind, locale)
    return { title: name ?? kind ?? '', kind: name ? kind : null, house, street }
  }
  if (house) {
    // Дом без названия: «Дом 5»; с названием (ТЦ, школа) — название и номер.
    const buildingName = houseFeature ? nameOf(houseFeature.properties, locale) : null
    return { title: buildingName ?? `${houseWord} ${house}`, kind: null, house: buildingName ? house : null, street }
  }
  return null
}

/** Короткая строка для подсказки при наведении: «Аптека «Ригла»», «Дом 5». */
export function shortPlaceLabel(info: PlaceInfo): string {
  // «Храм «Храм Усекновения…»» — лишнее: вид уже есть в названии.
  if (info.kind && !info.title.toLowerCase().includes(info.kind.toLowerCase())) return `${info.kind} «${info.title}»`
  return info.title
}
