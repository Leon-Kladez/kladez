type CoordinateOverlayProps = {
  latitude: number
  longitude: number
  x: number
  y: number
  /** Кладезъ: что под курсором («Аптека «Ригла»», «Дом 5»). */
  label?: string | null
  /** Показывать ли координаты (их можно скрыть кнопкой; подпись места остаётся). */
  showCoords?: boolean
}

export default function CoordinateOverlay({
  latitude,
  longitude,
  x,
  y,
  label = null,
  showCoords = true,
}: CoordinateOverlayProps) {
  if (!label && !showCoords) return null
  const lines = (label ? 1 : 0) + (showCoords ? 1 : 0)
  return (
    <div
      className="pointer-events-none absolute z-[9999] -translate-x-1/2 whitespace-nowrap rounded bg-black/75 px-2 py-1 text-white"
      style={{
        left: x,
        top: y - (lines > 1 ? 52 : 36),
      }}
    >
      {label && <div className="max-w-[320px] truncate text-xs font-medium">{label}</div>}
      {showCoords && (
        <div className="font-mono text-[11px]">
          {latitude.toFixed(6)}, {longitude.toFixed(6)}
        </div>
      )}
    </div>
  )
}
