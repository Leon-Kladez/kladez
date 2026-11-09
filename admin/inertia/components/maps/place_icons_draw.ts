// Кладезъ: значки мест (kz-*) рисуются прямо в браузере, когда карта их попросит
// (событие styleimagemissing) — спрайт из основы карт не меняется.
import type { Map as MaplibreMap } from 'maplibre-gl'
import { PLACE_GROUPS, PLACE_ICON_PREFIX } from '../../../constants/map_places'
import { PLACE_ICON_PATHS } from './place_icons'

const SIZE = 22 // CSS-пиксели
const RATIO = 2

function drawIcon(color: string, paths: string[]): ImageData | null {
  if (typeof document === 'undefined' || typeof Path2D === 'undefined') return null
  const px = SIZE * RATIO
  const canvas = document.createElement('canvas')
  canvas.width = px
  canvas.height = px
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // Кружок цвета группы с белой каймой.
  ctx.beginPath()
  ctx.arc(px / 2, px / 2, px / 2 - RATIO, 0, Math.PI * 2)
  ctx.fillStyle = color
  ctx.fill()
  ctx.lineWidth = 1.5 * RATIO
  ctx.strokeStyle = '#ffffff'
  ctx.stroke()
  // Значок Tabler 24×24 → вписать в середину.
  const inner = px * 0.62
  ctx.save()
  ctx.translate((px - inner) / 2, (px - inner) / 2)
  ctx.scale(inner / 24, inner / 24)
  ctx.lineWidth = 2.2
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = '#ffffff'
  for (const d of paths) ctx.stroke(new Path2D(d))
  ctx.restore()
  return ctx.getImageData(0, 0, px, px)
}

/** Подключить к карте. Возвращает функцию отключения. */
export function registerPlaceIcons(map: MaplibreMap): () => void {
  const onMissing = (e: { id: string }) => {
    if (!e.id?.startsWith(PLACE_ICON_PREFIX) || map.hasImage(e.id)) return
    const group = PLACE_GROUPS.find((g) => `${PLACE_ICON_PREFIX}${g.id}` === e.id)
    const paths = group ? PLACE_ICON_PATHS[group.icon] : null
    if (!group || !paths) return
    const image = drawIcon(group.color, paths)
    if (image) map.addImage(e.id, image, { pixelRatio: RATIO })
  }
  map.on('styleimagemissing', onMissing)
  return () => {
    map.off('styleimagemissing', onMissing)
  }
}
