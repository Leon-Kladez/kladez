// Кладезъ: разбор строки поиска по карте и подсчёт порядка результатов. Без базы — проверяется тестами.
//  «Пятницкая 7 с2»  → слова [пятницкая], дом «7с2»
//  «москва, ул. Ленина, д. 5» → слова [москва, ленина], дом «5»
//  «аптека» → слова [аптека]

export type ParsedSearch = {
  /** Слова для полнотекстового поиска (без «ул», «д» и т. п.). */
  words: string[]
  /** Номер дома в нормальном виде («7с2», «5к1», «12а», «3/1»), если есть. */
  house: string | null
}

const STOP_WORDS = new Set([
  'ул', 'улица', 'пр', 'пр-т', 'просп', 'проспект', 'пер', 'переулок', 'д', 'дом', 'г', 'город', 'гор',
  'пос', 'поселок', 'п', 'с', 'село', 'дер', 'деревня', 'наб', 'набережная', 'пл', 'площадь', 'ш', 'шоссе',
  'б-р', 'бульвар', 'обл', 'область', 'р-н', 'район', 'st', 'street', 'ave', 'avenue',
])
// Улицу «Набережная» или «Шоссейная» по одному слову не теряем: стоп-слово выбрасывается, только если есть другие слова.

const HOUSE_HEAD = /^\d+[а-яa-z]?(?:\/\d+[а-яa-z]?)?$/u
const HOUSE_TAIL = /^(?:к|корп|корпус|с|стр|строение|лит|литера)\.?\d*[а-я]?$/u

export function normalizeText(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim()
}

/** «7 с2», «7с2», «7 стр. 2», «7, строение 2» → «7с2»; «5 корп 1» → «5к1». */
export function normalizeHouse(s: string): string {
  return normalizeText(s)
    .replace(/[\s.,]+/g, '')
    .replace(/строение|стр/g, 'с')
    .replace(/корпус|корп/g, 'к')
    .replace(/литера|лит/g, '')
    .replace(/^(?:дом|д)(?=\d)/, '')
    .replace(/^вл(?:адение)?(?=\d)/, '')
}

export function parseSearch(input: string): ParsedSearch {
  const tokens = normalizeText(input)
    .replace(/[«»"'()]/g, ' ')
    .split(/[\s,;]+/)
    .map((t) => t.replace(/^[.\-]+|[.\-]+$/g, ''))
    .filter(Boolean)

  // Дом — с конца: «7», «7 с2», «7 к 1», «д. 5».
  let house: string | null = null
  let end = tokens.length
  if (end > 1) {
    const last = tokens[end - 1]
    const prev = tokens[end - 2]
    const prev2 = end > 2 ? tokens[end - 3] : ''
    if (HOUSE_TAIL.test(last) && /\d/.test(last) && HOUSE_HEAD.test(prev)) {
      house = prev + last
      end -= 2
    } else if (/^\d+$/.test(last) && /^(?:к|корп|корпус|с|стр|строение)$/.test(prev) && HOUSE_HEAD.test(prev2)) {
      house = prev2 + prev + last
      end -= 3
    } else if (HOUSE_HEAD.test(last)) {
      house = last
      end -= 1
    }
    // «д 5» / «дом 5» — служебное слово перед номером убираем.
    if (house && end > 1 && /^(?:д|дом|вл)$/.test(tokens[end - 1])) end -= 1
  }

  const rest = tokens.slice(0, end)
  const meaningful = rest.filter((t) => !STOP_WORDS.has(t))
  const words = (meaningful.length > 0 ? meaningful : rest)
    .map((t) => t.replace(/[^\p{L}\p{N}-]/gu, ''))
    .filter((t) => t.length > 0)
  // Без слов номер дома — это просто число («1812»): ищем его как слово.
  if (words.length === 0 && house) return { words: [house], house: null }
  return { words, house: house ? normalizeHouse(house) : null }
}

/** Запрос FTS5: каждое слово — по началу («пятн» найдёт «Пятницкая»), все слова обязательны. */
export function ftsQuery(words: string[]): string | null {
  const parts = words
    .map((w) => w.replace(/"/g, ''))
    .filter((w) => w.length > 0)
    .map((w) => (w.length >= 2 ? `"${w}"*` : `"${w}"`))
  return parts.length > 0 ? parts.join(' ') : null
}

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const dLat = (lat2 - lat1) * 111.2
  const dLon = (lon2 - lon1) * 111.2 * Math.cos((((lat1 + lat2) / 2) * Math.PI) / 180)
  return Math.hypot(dLat, dLon)
}

/**
 * Порядок результатов: важность записи (город > улица > место), совпадение названия с запросом
 * и близость к тому месту карты, которое сейчас на экране.
 */
export function scoreResult(opts: {
  rank: number
  name: string
  words: string[]
  distanceKm: number | null
}): number {
  const name = normalizeText(opts.name)
  const q = opts.words.join(' ')
  let score = opts.rank
  if (q && name === q) score += 50
  else if (q && name.startsWith(q)) score += 30
  else if (opts.words.length > 0 && name.split(/[\s-]+/).some((w) => w === opts.words[0])) score += 15
  // Близость важна: «аптека» — ближайшая, а не самая известная в области.
  if (opts.distanceKm !== null) score -= 25 * Math.log10(1 + opts.distanceKm)
  return score
}

/** Подходит ли дом из указателя к номеру из запроса: «7» ≈ «7», «7с2» ≈ «7 с2», «7» ⊂ «7к1». */
export function houseMatches(wanted: string, actual: string): 'exact' | 'prefix' | null {
  const a = normalizeHouse(actual)
  if (a === wanted) return 'exact'
  // «7» → «7к1», «7с2», но не «70».
  if (a.startsWith(wanted) && !/^\d/.test(a.slice(wanted.length))) return 'prefix'
  return null
}
