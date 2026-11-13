// Кладезъ: мелочи строки поиска на карте — координаты в строке и масштаб для найденного.

/** Середина карты прямо сейчас (обновляет карта при каждом сдвиге) — поиск ищет «рядом с ней». */
let liveCenter: { lat: number; lon: number } | null = null
export function setLiveMapCenter(lat: number, lon: number): void {
  liveCenter = { lat, lon }
}
export function getLiveMapCenter(): { lat: number; lon: number } | null {
  return liveCenter
}

/** «55.75, 37.62», «55,75 37,62», «55.75 37.62» → {lat, lng}; иначе null. */
export function parseCoordinatesInput(input: string): { lat: number; lng: number } | null {
  const s = input.trim()
  if (!s) return null
  let parts: string[]
  if (/^-?\d+(?:\.\d+)?\s*[,;\s]\s*-?\d+(?:\.\d+)?$/.test(s)) {
    parts = s.split(/\s*[,;\s]\s*/)
  } else if (/^-?\d+,\d+\s+-?\d+,\d+$/.test(s)) {
    // Русская запятая в дробях: «55,75 37,62».
    parts = s.split(/\s+/).map((p) => p.replace(',', '.'))
  } else {
    return null
  }
  if (parts.length !== 2) return null
  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) return null
  return { lat, lng }
}

/** Масштаб для найденного: город целиком, деревня, улица, дом. */
export function searchZoom(cls: string, kind: string | null): number {
  if (cls === 'place') {
    if (kind === 'city') return 11
    if (kind === 'town') return 13
    if (kind === 'suburb' || kind === 'borough') return 14
    return 15
  }
  if (cls === 'street') return 16
  return 17.5
}

/** Кладезъ: масштаб, при котором страна или регион [запад, юг, восток, север] видны целиком. */
export function zoomForBounds(b: [number, number, number, number]): number {
  const span = Math.max(b[2] - b[0], (b[3] - b[1]) * 1.6, 0.01)
  return Math.max(2, Math.min(12, Math.log2(360 / span) + 0.6))
}
