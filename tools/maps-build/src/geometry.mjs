// Контуры пакетов карт: объединение стран (NE admin-0) и субъектов (NE admin-1) с запасом по краю.

/** Запас по краю, градусы (~11 км) — как REGION_BUFFER_DEGREES в admin/app/services/countries_service.ts. */
export const REGION_BUFFER_DEGREES = 0.1

/**
 * @param {import('./regions.mjs').Region} region
 * @param {object} ne0 FeatureCollection Natural Earth admin-0 (поле ISO_A2_EH)
 * @param {object|null} ne1 FeatureCollection Natural Earth admin-1 (поле iso_3166_2); нужен, если в source есть admin1
 * @returns {object} FeatureCollection для `pmtiles extract --region`
 */
export function regionGeometry(region, ne0, ne1, buffer = REGION_BUFFER_DEGREES) {
  const countries = region.source.countries ?? []
  const admin1 = region.source.admin1 ?? []
  const picked = []
  for (const code of countries) {
    // Любой TYPE (в том числе Disputed, Indeterminate): границ не проводим.
    const found = ne0.features.filter((f) => f.properties.ISO_A2_EH === code)
    if (found.length === 0) throw new Error(`${region.id}: страна ${code} не найдена в Natural Earth admin-0`)
    picked.push(...found)
  }
  if (admin1.length > 0) {
    if (!ne1) throw new Error(`${region.id}: нужен файл Natural Earth admin-1`)
    for (const code of admin1) {
      const found = ne1.features.filter((f) => f.properties.iso_3166_2 === code)
      if (found.length === 0) throw new Error(`${region.id}: субъект ${code} не найден в Natural Earth admin-1`)
      picked.push(...found)
    }
  }
  return {
    type: 'FeatureCollection',
    features: picked.map((f) => ({
      type: 'Feature',
      properties: {},
      geometry: clampGeometry(bufferGeometry(f.geometry, buffer)),
    })),
  }
}

// ---- Запас по краю: перенос на JS алгоритма из admin/app/services/countries_service.ts ----

export function bufferGeometry(geometry, buffer = REGION_BUFFER_DEGREES) {
  if (geometry?.type === 'Polygon') return { type: 'Polygon', coordinates: geometry.coordinates.map((r) => bufferRing(r, buffer)) }
  if (geometry?.type === 'MultiPolygon')
    return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((p) => p.map((r) => bufferRing(r, buffer))) }
  return geometry
}

function bufferRing(ring, buffer) {
  if (ring.length < 4) return ring
  const sign = signedArea(ring) > 0 ? 1 : -1
  const n = ring.length - 1
  const out = []
  for (let i = 0; i < n; i++) {
    const prev = ring[(i - 1 + n) % n]
    const curr = ring[i]
    const next = ring[(i + 1) % n]
    const l1 = Math.hypot(curr[0] - prev[0], curr[1] - prev[1]) || 1
    const l2 = Math.hypot(next[0] - curr[0], next[1] - curr[1]) || 1
    const sumX = ((curr[1] - prev[1]) / l1 + (next[1] - curr[1]) / l2) * sign
    const sumY = (-(curr[0] - prev[0]) / l1 - (next[0] - curr[0]) / l2) * sign
    const sl = Math.hypot(sumX, sumY) || 1
    out.push([curr[0] + (sumX / sl) * buffer, curr[1] + (sumY / sl) * buffer])
  }
  out.push(out[0])
  return out
}

function signedArea(ring) {
  let a = 0
  for (let i = 0; i < ring.length - 1; i++) a += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1]
  return a / 2
}

/** Запас не должен выводить точки за край карты (у Чукотки — за 180°). */
function clampGeometry(geometry) {
  const c = ([x, y]) => [Math.max(-180, Math.min(180, x)), Math.max(-85.0511, Math.min(85.0511, y))]
  if (geometry.type === 'Polygon') return { type: 'Polygon', coordinates: geometry.coordinates.map((r) => r.map(c)) }
  return { type: 'MultiPolygon', coordinates: geometry.coordinates.map((p) => p.map((r) => r.map(c))) }
}

// ---- Точка внутри контура (для тестов и схемы округов) ----

function inRing([x, y], ring) {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}

function inPolygon(pt, rings) {
  return inRing(pt, rings[0]) && !rings.slice(1).some((h) => inRing(pt, h))
}

export function pointInGeometry(pt, fc) {
  return fc.features.some(({ geometry: g }) =>
    g.type === 'Polygon' ? inPolygon(pt, g.coordinates) : g.coordinates.some((p) => inPolygon(pt, p))
  )
}
