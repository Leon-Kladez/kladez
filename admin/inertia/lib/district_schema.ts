// Схема федеральных округов России для окна выбора: простой рисунок SVG без карты и без сети.

export const SCHEMA_WIDTH = 600
export const SCHEMA_HEIGHT = 300

// Россия — примерно от 19° до 191° в. д. (Чукотка за 180° переносится вправо) и от 41° до 82° с. ш.
const LON_MIN = 19
const LON_MAX = 191
const LAT_MIN = 41
const LAT_MAX = 82
// Сжатие по широте, чтобы север не растягивался (как у карты на 60° с. ш.).
const X_SCALE = SCHEMA_WIDTH / (LON_MAX - LON_MIN)
const Y_SCALE = SCHEMA_HEIGHT / (LAT_MAX - LAT_MIN)

export function projectRussia([lon, lat]: number[]): [number, number] {
  const l = lon < 0 ? lon + 360 : lon
  const x = Math.min(SCHEMA_WIDTH, Math.max(0, (l - LON_MIN) * X_SCALE))
  const y = Math.min(SCHEMA_HEIGHT, Math.max(0, (LAT_MAX - lat) * Y_SCALE))
  return [Math.round(x * 10) / 10, Math.round(y * 10) / 10]
}

type Geometry = { type: 'Polygon'; coordinates: number[][][] } | { type: 'MultiPolygon'; coordinates: number[][][][] }

function ringToPath(ring: number[][]): string {
  const pts = ring.slice(0, -1).map(projectRussia)
  return 'M' + pts.map(([x, y]) => `${x},${y}`).join('L') + 'Z'
}

/** Контур → атрибут `d` элемента <path>; дырки рисуются правилом evenodd. */
export function geometryToPath(geometry: Geometry): string {
  const polys = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates
  return polys.map((rings) => rings.map(ringToPath).join('')).join('')
}
