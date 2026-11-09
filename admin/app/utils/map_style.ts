// Кладезъ: дополнения к оформлению карты (шаблон nomad-base-styles.json приходит из основы карт
// и не меняется). Применяется к слоям-шаблонам до того, как они размножаются по регионам.
//  • номера домов — на всех домах с номером и раньше (с 16-го масштаба, а не с 18-го);
//  • важные места (аптеки, больницы, полиция, метро, банки…) — своими значками kz-*.
import type { MapLayer } from '../../types/maps.js'
import { PLACE_GROUPS, PLACE_ICON_PREFIX } from '../../constants/map_places.js'
import type { Locale } from '../../constants/i18n/index.js'

export const HOUSE_NUMBER_MINZOOM = 16
export const PLACES_LAYER_ID = 'kz_places'

const NAME_RU = ['coalesce', ['get', 'name:ru'], ['get', 'name']]

export function placesLayer(): MapLayer {
  const iconMatch: unknown[] = ['match', ['get', 'kind']]
  const colorMatch: unknown[] = ['match', ['get', 'kind']]
  for (const g of PLACE_GROUPS) {
    iconMatch.push(g.kinds, `${PLACE_ICON_PREFIX}${g.id}`)
    colorMatch.push(g.kinds, g.color)
  }
  iconMatch.push('')
  colorMatch.push('#555555')
  const kinds = PLACE_GROUPS.flatMap((g) => g.kinds)
  const earlyKinds = PLACE_GROUPS.filter((g) => g.early).flatMap((g) => g.kinds)
  return {
    'id': PLACES_LAYER_ID,
    'type': 'symbol',
    'source': 'protomaps',
    'source-layer': 'pois',
    'minzoom': 13,
    'filter': [
      'all',
      ['in', ['get', 'kind'], ['literal', kinds]],
      // На масштаб раньше, чем в данных: важное видно, пока ещё ищешь район.
      ['>=', ['zoom'], ['-', ['coalesce', ['get', 'min_zoom'], 14], 1]],
      // При отдалении — только самое нужное (больница, полиция, метро…), иначе всё в значках.
      ['any', ['>=', ['zoom'], 15], ['in', ['get', 'kind'], ['literal', earlyKinds]]],
    ],
    'layout': {
      'icon-image': iconMatch,
      'icon-size': ['interpolate', ['linear'], ['zoom'], 13, 0.75, 16, 1],
      'icon-allow-overlap': false,
      'text-field': ['step', ['zoom'], '', 15, NAME_RU],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-max-width': 8,
      'text-optional': true,
      'text-variable-anchor': ['left', 'right', 'top'],
      'text-radial-offset': 1.1,
      'symbol-sort-key': ['coalesce', ['get', 'min_zoom'], 14],
    },
    'paint': {
      'text-color': colorMatch,
      'text-halo-color': '#ffffff',
      'text-halo-width': 1.2,
    },
  }
}

export function houseNumberLayer(base?: MapLayer): MapLayer {
  return {
    ...(base ?? {}),
    'id': base?.id ?? 'address_label',
    'type': 'symbol',
    'source': base?.source ?? 'protomaps',
    'source-layer': 'buildings',
    'minzoom': HOUSE_NUMBER_MINZOOM,
    // И отдельные точки-адреса, и номера, записанные на самих домах.
    'filter': ['has', 'addr_housenumber'],
    'layout': {
      'symbol-placement': 'point',
      'text-font': ['Noto Sans Regular'],
      'text-field': ['get', 'addr_housenumber'],
      'text-size': ['interpolate', ['linear'], ['zoom'], 16, 10, 19, 13],
      'text-padding': 1,
    },
    'paint': {
      'text-color': '#6b6266',
      'text-halo-color': '#ffffff',
      'text-halo-width': 1,
    },
  }
}

const NAME_EN = ['coalesce', ['get', 'name:en'], ['get', 'name']]

/** Подпись слоя опирается на название объекта (а не на номер дома, ref дороги и т. п.). */
function usesName(textField: unknown): boolean {
  return /"(name|name:ru|pgf:name)"/.test(JSON.stringify(textField ?? null))
}

/** Подписи на языке панели: шаблон уже русский; для английского — name:en, иначе исходное. */
function localizeLabels(layer: MapLayer, locale: Locale): MapLayer {
  if (locale !== 'en' || layer.type !== 'symbol' || !usesName(layer.layout?.['text-field'])) return layer
  return { ...layer, layout: { ...layer.layout, 'text-field': NAME_EN } }
}

/** Слои шаблона → слои с номерами домов и важными местами. Вход не меняется. */
export function applyKladezStyle(layers: MapLayer[], locale: Locale = 'ru'): MapLayer[] {
  const out = buildLayers(layers)
  return out.map((l) => localizeLabels(l, locale))
}

function buildLayers(layers: MapLayer[]): MapLayer[] {
  const out: MapLayer[] = []
  let placesAdded = false
  for (const layer of layers) {
    if (layer.id === PLACES_LAYER_ID) continue // уже применено
    if (layer.id === 'address_label') {
      out.push(houseNumberLayer(layer))
      continue
    }
    out.push(layer)
    // Сразу после обычных мест: верхние слои ставят подписи первыми — важное не вытесняется кафе.
    if (layer.id === 'pois') {
      out.push(placesLayer())
      placesAdded = true
    }
  }
  if (!placesAdded) out.push(placesLayer())
  if (!out.some((l) => l.id === 'address_label')) {
    // Шаблон без номеров — ставим их под подписи улиц.
    const at = out.findIndex((l) => l.type === 'symbol')
    out.splice(at === -1 ? out.length : at, 0, houseNumberLayer())
  }
  return out
}
