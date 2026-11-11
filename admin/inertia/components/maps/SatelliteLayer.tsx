import { useEffect, useRef, useState } from 'react'
import { Layer, Source, useMap } from 'react-map-gl/maplibre'

/**
 * Кладезъ: спутниковые снимки (Esri World Imagery) — только с интернетом, приближение до домов.
 * Снимки ложатся над фоном схемы; заливки и линии схемы (у мира и у каждой скачанной карты свои)
 * на это время прячутся, подписи и значки — остаются сверху, если включены. Линия маршрута,
 * метки и «где я» — свои слои Кладезя (kz-…), их не трогаем.
 * Без интернета плитки не грузятся — об этом один раз говорит onError; схема работает как обычно.
 */
export const SATELLITE_TILES =
  'https://services.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
const SATELLITE_ATTRIBUTION =
  'Powered by <a href="https://www.esri.com" target="_blank" rel="noopener">Esri</a> | Esri, Maxar, Earthstar Geographics, GIS User Community'
const SOURCE_ID = 'kz-satellite'

type StyleLayer = { id: string; type: string }

/** Слои схемы, которые прячем под спутником: всё, кроме фона, растров и (с подписями) подписей. */
export function layersToHide(layers: StyleLayer[], labels: boolean): string[] {
  return layers
    .filter((l) => !l.id.startsWith('kz-') && l.type !== 'background' && l.type !== 'raster')
    .filter((l) => !labels || l.type !== 'symbol')
    .map((l) => l.id)
}

export default function SatelliteLayer({ labels, onError }: { labels: boolean; onError?: () => void }) {
  const { current: ref } = useMap()
  // Слой, под который кладём снимки: первый после фона (снимки — в самом низу, над фоном).
  const [beforeId, setBeforeId] = useState<string | null>(null)
  const onErrorRef = useRef(onError)
  onErrorRef.current = onError

  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    const pick = () => {
      const first = map.getStyle()?.layers?.find((l) => l.type !== 'background' && !l.id.startsWith('kz-'))
      setBeforeId(first?.id ?? '')
    }
    if (map.isStyleLoaded()) pick()
    else map.once('styledata', pick)
  }, [ref])

  // Спрятать заливки и линии схемы (и подписи, если выключены); при выходе вернуть как было.
  useEffect(() => {
    const map = ref?.getMap()
    if (!map || beforeId === null) return
    const ids = layersToHide((map.getStyle()?.layers ?? []) as StyleLayer[], labels)
    const was = new Map(ids.map((id) => [id, map.getLayoutProperty(id, 'visibility') ?? 'visible']))
    for (const id of ids) map.setLayoutProperty(id, 'visibility', 'none')
    return () => {
      for (const [id, v] of was) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', v)
    }
  }, [ref, labels, beforeId])

  // Плитки не грузятся (нет интернета) — сказать один раз.
  useEffect(() => {
    const map = ref?.getMap()
    if (!map) return
    let told = false
    const handler = (e: { sourceId?: string }) => {
      if (e.sourceId !== SOURCE_ID || told) return
      told = true
      onErrorRef.current?.()
    }
    map.on('error', handler)
    return () => {
      map.off('error', handler)
    }
  }, [ref])

  if (beforeId === null) return null
  return (
    <Source id={SOURCE_ID} type="raster" tiles={[SATELLITE_TILES]} tileSize={256} maxzoom={19} attribution={SATELLITE_ATTRIBUTION}>
      <Layer id="kz-satellite" type="raster" beforeId={beforeId || undefined} paint={{ 'raster-fade-duration': 150 }} />
    </Source>
  )
}
