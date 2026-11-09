// Кладезъ: мелочи строки поиска на карте — координаты в строке и масштаб для найденного.

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
