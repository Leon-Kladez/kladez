// Кладезъ: маршруты без интернета — запрос к Valhalla и разбор ответа. Без сети и базы: проверяется тестами.

export type RouteMode = 'auto' | 'pedestrian' | 'bicycle'
export const ROUTE_MODES: RouteMode[] = ['auto', 'pedestrian', 'bicycle']

export type RoutePoint = { lat: number; lon: number }

export type RouteStep = {
  /** Подсказка на языке панели: «Поверните направо на Пятницкую улицу». */
  instruction: string
  /** Сколько ехать/идти после поворота, км. */
  distanceKm: number
  /** Сколько это займёт, мин. */
  timeMin: number
  /** Где на линии маршрута начинается шаг (индекс точки). */
  at: number
  /** Тип манёвра Valhalla — для значка (налево, направо, прямо…). */
  type: number
}

export type RouteResult = {
  mode: RouteMode
  distanceKm: number
  timeMin: number
  /** Линия маршрута: [долгота, широта] — как в GeoJSON. */
  line: [number, number][]
  steps: RouteStep[]
  /** Границы линии [запад, юг, восток, север] — чтобы показать маршрут целиком. */
  bounds: [number, number, number, number]
}

/** Тело запроса /route для Valhalla. */
export function valhallaRouteRequest(from: RoutePoint, to: RoutePoint, mode: RouteMode, language: string) {
  return {
    locations: [
      { lat: from.lat, lon: from.lon, type: 'break' },
      { lat: to.lat, lon: to.lon, type: 'break' },
    ],
    costing: mode,
    // Пешком — без лестниц-ограничений не трогаем; велосипед — обычный городской.
    costing_options: mode === 'bicycle' ? { bicycle: { bicycle_type: 'Hybrid' } } : undefined,
    language,
    units: 'kilometers',
    directions_options: { units: 'kilometers', language },
  }
}

/**
 * Линия Valhalla — «encoded polyline» с точностью 1e6 (polyline6).
 * Возвращает [долгота, широта] (порядок GeoJSON).
 */
export function decodePolyline6(encoded: string): [number, number][] {
  const out: [number, number][] = []
  let index = 0
  let lat = 0
  let lon = 0
  while (index < encoded.length) {
    for (const which of [0, 1]) {
      let result = 0
      let shift = 0
      let b: number
      do {
        b = encoded.charCodeAt(index++) - 63
        result |= (b & 0x1f) << shift
        shift += 5
      } while (b >= 0x20)
      const delta = result & 1 ? ~(result >> 1) : result >> 1
      if (which === 0) lat += delta
      else lon += delta
    }
    out.push([lon / 1e6, lat / 1e6])
  }
  return out
}

export function lineBounds(line: [number, number][]): [number, number, number, number] {
  let w = Infinity
  let s = Infinity
  let e = -Infinity
  let n = -Infinity
  for (const [x, y] of line) {
    if (x < w) w = x
    if (x > e) e = x
    if (y < s) s = y
    if (y > n) n = y
  }
  return [w, s, e, n]
}

/** Ответ Valhalla → то, что рисует и показывает Кладезъ. */
export function parseValhallaRoute(body: any, mode: RouteMode): RouteResult {
  const trip = body?.trip
  if (!trip?.legs?.length) throw new Error('no_route')
  const line: [number, number][] = []
  const steps: RouteStep[] = []
  for (const leg of trip.legs) {
    const offset = line.length
    const legLine = decodePolyline6(String(leg.shape ?? ''))
    line.push(...legLine)
    for (const m of leg.maneuvers ?? []) {
      steps.push({
        instruction: String(m.instruction ?? ''),
        distanceKm: Math.round((Number(m.length) || 0) * 100) / 100,
        timeMin: Math.max(0, Math.round((Number(m.time) || 0) / 6) / 10),
        at: offset + (Number(m.begin_shape_index) || 0),
        type: Number(m.type) || 0,
      })
    }
  }
  if (line.length < 2) throw new Error('no_route')
  return {
    mode,
    distanceKm: Math.round((Number(trip.summary?.length) || 0) * 10) / 10,
    timeMin: Math.round((Number(trip.summary?.time) || 0) / 60),
    line,
    steps,
    bounds: lineBounds(line),
  }
}

/** Код ошибки Valhalla → понятная причина (ключ перевода). */
export function routeErrorKey(body: any): 'routes.noRoad' | 'routes.tooFar' | 'routes.noData' | 'routes.failed' {
  const code = Number(body?.error_code)
  // 171: нет пути; 442: нет маршрута между точками; 170/171 — точки не на дорогах.
  if (code === 442 || code === 443) return 'routes.noRoad'
  if (code === 154 || code === 155 || code === 156) return 'routes.tooFar'
  if (code === 170 || code === 171 || code === 172) return 'routes.noData'
  return 'routes.failed'
}
