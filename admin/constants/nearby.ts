/**
 * «Кладезъ»: «Рядом» на карте — что искать в первую очередь, когда надо срочно.
 * Виды мест — как в указателях поиска (OpenStreetMap). «chemist» в России — бытовая химия и
 * косметика, а не аптека, поэтому его нет. «shelter» — чаще остановочный навес, тоже нет.
 */
export type NearbyGroup = { id: string; kinds: string[]; icon: string }

export const NEARBY_GROUPS: NearbyGroup[] = [
  { id: 'pharmacy', kinds: ['pharmacy'], icon: 'pill' },
  { id: 'medical', kinds: ['hospital', 'clinic', 'doctors'], icon: 'building-hospital' },
  { id: 'food', kinds: ['supermarket', 'convenience', 'marketplace', 'greengrocer', 'bakery', 'butcher'], icon: 'shopping-cart' },
  { id: 'water', kinds: ['drinking_water', 'water_point'], icon: 'droplet' },
  { id: 'fuel', kinds: ['fuel'], icon: 'gas-station' },
  { id: 'money', kinds: ['atm', 'bank'], icon: 'cash' },
  { id: 'police', kinds: ['police'], icon: 'shield' },
  { id: 'fire', kinds: ['fire_station', 'rescue_station'], icon: 'flame' },
]

/** Радиусы поиска по очереди: сначала рядом, если пусто — дальше. */
export const NEARBY_RADII_KM = [1.5, 5, 15, 40]
export const NEARBY_PER_GROUP = 3

export type NearbyPlace = {
  name: string
  kind: string | null
  lat: number
  lon: number
  distanceM: number
  address: string | null
}

export type NearbyCandidate = Omit<NearbyPlace, 'distanceM'> & { distanceKm: number }

/**
 * Ближайшие N мест группы из найденного в нескольких указателях: по расстоянию, одно и то же
 * место (точка и здание с тем же именем в 100 м) — один раз.
 */
export function pickNearest(candidates: NearbyCandidate[], limit = NEARBY_PER_GROUP): NearbyPlace[] {
  const sorted = [...candidates].sort((a, b) => a.distanceKm - b.distanceKm)
  const out: NearbyPlace[] = []
  for (const c of sorted) {
    const twin = out.find(
      (p) => p.kind === c.kind && p.name === c.name && Math.abs(p.distanceM - c.distanceKm * 1000) < 100
    )
    if (twin) continue
    out.push({ name: c.name, kind: c.kind, lat: c.lat, lon: c.lon, distanceM: Math.round(c.distanceKm * 1000), address: c.address })
    if (out.length >= limit) break
  }
  return out
}
