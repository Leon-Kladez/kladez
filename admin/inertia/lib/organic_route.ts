/**
 * «Кладезъ»: «Поехали» — отдать построенный маршрут навигатору Organic Maps в телефоне.
 * Он ведёт по GPS без интернета, с голосом и перестройкой пути (браузер так не умеет: без
 * защищённого адреса он не даёт странице GPS и выключает его, когда гаснет экран).
 *
 * Формат ссылки — из исходников Organic Maps (libs/map/mwm_url.cpp): om://route, все пять
 * частей обязательны и строго по порядку: sll, saddr, dll, daddr, type; точки — «широта,долгота»;
 * способ — vehicle | pedestrian | bicycle. Без React — чтобы проверять тестами.
 */
export type GoMode = 'auto' | 'pedestrian' | 'bicycle'
export type GoEnd = { lat: number; lon: number; label: string }
export type GoTrip = { from: GoEnd; to: GoEnd; mode: GoMode }

const OM_TYPE: Record<GoMode, string> = { auto: 'vehicle', pedestrian: 'pedestrian', bicycle: 'bicycle' }

function coord(n: number): string {
  return String(Math.round(n * 1e6) / 1e6)
}

function point(e: GoEnd): string {
  return `${coord(e.lat)},${coord(e.lon)}`
}

/** Название точки для навигатора: без переносов, не длиннее 60 знаков; пустое — «Точка». */
function name(label: string): string {
  const clean = label.replace(/\s+/g, ' ').trim().slice(0, 60)
  return encodeURIComponent(clean || '•')
}

/** om://route?sll=…&saddr=…&dll=…&daddr=…&type=… — порядок важен, Organic Maps проверяет его. */
export function organicMapsRouteUrl(trip: GoTrip): string {
  return (
    `om://route?sll=${point(trip.from)}&saddr=${name(trip.from.label)}` +
    `&dll=${point(trip.to)}&daddr=${name(trip.to.label)}&type=${OM_TYPE[trip.mode]}`
  )
}

/** Страница Кладезя «Открыть в навигаторе» — для QR-кода на компьютере. */
export function goPath(trip: GoTrip): string {
  const q = new URLSearchParams({
    f: point(trip.from),
    fn: trip.from.label,
    t: point(trip.to),
    tn: trip.to.label,
    m: trip.mode,
  })
  return `/go?${q.toString()}`
}

function parsePoint(v: string | null): { lat: number; lon: number } | null {
  const m = /^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/.exec(v ?? '')
  if (!m) return null
  const lat = Number(m[1])
  const lon = Number(m[2])
  if (!(Math.abs(lat) <= 90 && Math.abs(lon) <= 180)) return null
  return { lat, lon }
}

/** Разобрать адрес страницы /go?… обратно в маршрут; что-то не так — null. */
export function parseGoQuery(search: string): GoTrip | null {
  const q = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)
  const from = parsePoint(q.get('f'))
  const to = parsePoint(q.get('t'))
  const mode = q.get('m') as GoMode | null
  if (!from || !to || !mode || !(mode in OM_TYPE)) return null
  return {
    from: { ...from, label: (q.get('fn') ?? '').slice(0, 120) },
    to: { ...to, label: (q.get('tn') ?? '').slice(0, 120) },
    mode,
  }
}
