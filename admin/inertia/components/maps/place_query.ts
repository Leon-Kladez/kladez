import type { Map as MaplibreMap } from 'maplibre-gl'
import { describePlace, templateLayerId, type PlaceInfo } from '../../lib/map_place_info'
import { getLocale, t } from '../../../constants/i18n'

// Кладезъ: слои, по которым узнаём, что под курсором/пальцем — места, дома, улицы.
const PLACE_TEMPLATE_LAYERS = new Set(['kz_places', 'pois', 'address_label', 'buildings'])

export function placeAt(map: MaplibreMap, x: number, y: number, withStreet: boolean): PlaceInfo | null {
  const style = map.getStyle()
  if (!style?.layers) return null
  const ids = style.layers.map((l) => l.id)
  const placeLayers = ids.filter((id) => PLACE_TEMPLATE_LAYERS.has(templateLayerId(id)))
  if (placeLayers.length === 0) return null
  const pad = 8
  const features = map
    .queryRenderedFeatures(
      [
        [x - pad, y - pad],
        [x + pad, y + pad],
      ],
      { layers: placeLayers }
    )
    .map((f) => ({ layer: templateLayerId(f.layer.id), properties: (f.properties ?? {}) as Record<string, unknown> }))
  let roads: { layer: string; properties: Record<string, unknown> }[] = []
  if (withStreet && features.length > 0) {
    const roadLayers = ids.filter((id) => {
      const tpl = templateLayerId(id)
      return tpl.startsWith('roads_') && !tpl.includes('casing') && !tpl.includes('rail') && !tpl.includes('shields')
    })
    // Ближайшая улица: окно растёт, пока не найдётся дорога с названием.
    for (const r of [20, 45, 90]) {
      roads = map
        .queryRenderedFeatures(
          [
            [x - r, y - r],
            [x + r, y + r],
          ],
          { layers: roadLayers }
        )
        .map((f) => ({ layer: templateLayerId(f.layer.id), properties: (f.properties ?? {}) as Record<string, unknown> }))
        .filter((f) => typeof f.properties.name === 'string')
      if (roads.length > 0) break
    }
  }
  return describePlace(features, roads, getLocale(), t('mapsUi.house'))
}
