// Кладезъ: поиск по карте без интернета — по указателям search-<регион>_<версия>.sqlite
// (собираются в kladez-maps, скачиваются вместе с картой). SQLite встроен в Node (node:sqlite).
import { DatabaseSync } from 'node:sqlite'
import { createReadStream } from 'node:fs'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  distanceKm,
  ftsQuery,
  houseMatches,
  normalizeText,
  parseCitySearch,
  scoreResult,
} from '../utils/map_search_query.js'

export const SEARCH_DIR = '/storage/maps/search'
export const SEARCH_FILE_RE = /^search-([a-z0-9-]+)_(\d{4}-\d{2})\.sqlite$/
const SUPPORTED_SCHEMA = 1

import type { MapSearchResult } from '../../types/maps.js'
export type { MapSearchResult }

type Row = {
  id: number
  cls: string
  kind: string | null
  name: string
  name_en: string | null
  city: string | null
  street: string | null
  house: string | null
  lat: number
  lon: number
  rank: number
}

type OpenDb = { db: DatabaseSync; mtimeMs: number; region: string }

// Журнал — через console: сервис работает и без запущенного AdonisJS (тесты, команды).
const logger = {
  warn: (a: unknown, b?: string) => console.warn('[MapSearch]', b ?? a, b ? a : ''),
  info: (a: string) => console.info(a),
}

/** Самый новый файл на регион: старые версии не открываем (их убирает ensure). */
export function newestPerRegion(names: string[]): Map<string, string> {
  const best = new Map<string, { name: string; version: string }>()
  for (const name of names) {
    const m = SEARCH_FILE_RE.exec(name)
    if (!m) continue
    const cur = best.get(m[1])
    if (!cur || m[2] > cur.version) best.set(m[1], { name, version: m[2] })
  }
  return new Map([...best].map(([region, v]) => [region, v.name]))
}

/**
 * Совпадения в одном указателе. Поле «город» есть у тысяч мест, поэтому:
 *  • сначала — только по названию и виду места (иначе «Пятигорск» тонет в местах Пятигорска);
 *  • по городу — лишь когда слов несколько («пятницкая москва»);
 *  • населённые пункты — отдельно, чтобы город всегда был среди кандидатов.
 */
function searchRows(
  db: DatabaseSync,
  match: string,
  wordCount: number,
  near: { lat: number; lon: number } | null,
  cityMatch: string | null = null
): Row[] {
  // «Город, улица»: улица — по названию, город — только по полю «город».
  if (cityMatch) {
    const rows = db
      .prepare(
        `SELECT i.* FROM items_fts JOIN items i ON i.id = items_fts.rowid
         WHERE items_fts MATCH ? ORDER BY bm25(items_fts, 10.0, 8.0, 4.0, 1.0) LIMIT 300`
      )
      .all(`{name name_en words}: (${match}) AND {city}: (${cityMatch})`) as Row[]
    return rows
  }
  const byName = `{name name_en words}: (${match})`
  const sql = (extra: string, limit: number) =>
    `SELECT i.* FROM items_fts JOIN items i ON i.id = items_fts.rowid
     WHERE items_fts MATCH ? ${extra} ORDER BY bm25(items_fts, 10.0, 8.0, 4.0, 1.0) LIMIT ${limit}`
  const rows = new Map<number, Row>()
  const add = (list: unknown[]) => {
    for (const r of list as Row[]) if (!rows.has(r.id)) rows.set(r.id, r)
  }
  // Города отдельно: на «Каза» в округе сотни сёл, и bm25 оставляет Казань за первыми тридцатью.
  add(db.prepare(sql(`AND i.cls = 'place' AND i.kind IN ('city', 'town')`, 30)).all(byName))
  add(db.prepare(sql(`AND i.cls = 'place'`, 30)).all(byName))
  // Рядом с открытым местом карты (~15 км): аптек в округе тысячи — ближние не должны теряться.
  if (near) {
    const dLat = 0.14
    const dLon = 0.14 / Math.max(0.2, Math.cos((near.lat * Math.PI) / 180))
    add(
      db
        .prepare(sql('AND i.lat BETWEEN ? AND ? AND i.lon BETWEEN ? AND ?', 300))
        .all(byName, near.lat - dLat, near.lat + dLat, near.lon - dLon, near.lon + dLon)
    )
  }
  // По виду места («аптека», «метро») совсем рядом (~3 км): иначе ближнюю «Ригла» вытесняют
  // сотни «Аптека …» в названиях по всему округу.
  if (near) {
    const dLat = 0.03
    const dLon = 0.03 / Math.max(0.2, Math.cos((near.lat * Math.PI) / 180))
    add(
      db
        .prepare(sql('AND i.lat BETWEEN ? AND ? AND i.lon BETWEEN ? AND ?', 200))
        .all(`{words}: (${match})`, near.lat - dLat, near.lat + dLat, near.lon - dLon, near.lon + dLon)
    )
  }
  add(db.prepare(sql('', 300)).all(byName))
  if (wordCount > 1) add(db.prepare(sql('', 300)).all(match))
  return [...rows.values()]
}

/**
 * «Ростов, Бер»: город, название которого начинается с введённого целым словом
 * (Ростов-на-Дону, «Ростов» = Ростов) — выше, чем где это лишь начало слова (Ростовцево).
 */
export function cityBonus(city: string | null, cityWords: string[] | undefined): number {
  if (!cityWords?.length || !city) return 0
  const c = normalizeText(city)
  const q = cityWords.join(' ')
  if (c === q) return 60
  if (c.startsWith(q) && /^[\s-]/.test(c.slice(q.length))) return 45
  if (c.startsWith(q)) return 10
  return 0
}

export class MapSearchService {
  private static open = new Map<string, OpenDb>()

  static dir(): string {
    return join(process.cwd(), SEARCH_DIR)
  }

  /** Список указателей на диске: регион → имя файла. */
  static async files(): Promise<Map<string, string>> {
    try {
      return newestPerRegion(await readdir(this.dir()))
    } catch {
      return new Map()
    }
  }

  /** Закрыть открытые файлы (перед удалением или заменой). */
  static closeAll(): void {
    for (const { db } of this.open.values()) {
      try {
        db.close()
      } catch {}
    }
    this.open.clear()
  }

  static async databases(): Promise<OpenDb[]> {
    const files = await this.files()
    const out: OpenDb[] = []
    // Закрыть то, чего больше нет (удалили карту, пришла новая версия).
    for (const [name, o] of this.open) {
      if (![...files.values()].includes(name)) {
        try {
          o.db.close()
        } catch {}
        this.open.delete(name)
      }
    }
    for (const [region, name] of files) {
      const path = join(this.dir(), name)
      let mtimeMs = 0
      try {
        mtimeMs = (await stat(path)).mtimeMs
      } catch {
        continue
      }
      let o = this.open.get(name)
      if (o && o.mtimeMs !== mtimeMs) {
        try {
          o.db.close()
        } catch {}
        o = undefined
      }
      if (!o) {
        try {
          const db = new DatabaseSync(path, { readOnly: true })
          const schema = db.prepare(`SELECT value FROM meta WHERE key = 'schema'`).get() as { value?: string } | undefined
          if (Number(schema?.value) !== SUPPORTED_SCHEMA) {
            logger.warn(`[MapSearch] ${name}: неизвестная схема ${schema?.value}, пропускаю`)
            db.close()
            continue
          }
          o = { db, mtimeMs, region }
          this.open.set(name, o)
          // Новый или обновлённый указатель — прочитать заранее в фоне.
          void this.warmUp()
        } catch (err) {
          logger.warn({ err }, `[MapSearch] не открылся ${name}`)
          continue
        }
      }
      out.push(o)
    }
    return out
  }

  private static warmed = new Set<string>()

  /**
   * Прочитать указатели целиком один раз, подряд и не блокируя сервер. Поиск читает файл
   * вразнобой мелкими кусками, а у Windows-установки файлы лежат на диске D: за мостом WSL:
   * сразу после включения компьютера первая подсказка ждала 20–40 секунд. После сплошного
   * чтения (~120 МБ/с) файлы в памяти системы, и подсказки идут за доли секунды.
   */
  static async warmUp(): Promise<void> {
    const started = Date.now()
    let bytes = 0
    for (const name of (await this.files()).values()) {
      const path = join(this.dir(), name)
      try {
        const { mtimeMs, size } = await stat(path)
        const key = `${name}:${mtimeMs}`
        if (this.warmed.has(key)) continue
        this.warmed.add(key)
        await new Promise<void>((resolve) => {
          const s = createReadStream(path, { highWaterMark: 4 * 1024 * 1024 })
          s.on('data', () => {})
          s.on('error', () => resolve())
          s.on('end', () => resolve())
        })
        bytes += size
      } catch {}
    }
    if (bytes) logger.info(`[MapSearch] указатели прочитаны заранее: ${Math.round(bytes / 1e6)} МБ за ${Date.now() - started} мс`)
  }

  /** Есть ли хоть один указатель (для подсказки «скачайте поиск»). */
  static async available(): Promise<string[]> {
    return [...(await this.files()).keys()]
  }

  static async search(
    input: string,
    opts: { lat?: number | null; lon?: number | null; limit?: number; english?: boolean } = {}
  ): Promise<MapSearchResult[]> {
    const parsed = parseCitySearch(input)
    const cityMatch = parsed.city ? ftsQuery(parsed.city) : null
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50)
    const hasPos = Number.isFinite(opts.lat) && Number.isFinite(opts.lon)
    const dist = (lat: number, lon: number) => (hasPos ? distanceKm(opts.lat!, opts.lon!, lat, lon) : null)
    const queries: { words: string[]; withHouse: boolean }[] = [{ words: parsed.words, withHouse: !!parsed.house }]
    // «школа 5» — это и «дом 5 на улице Школьной», и «Школа № 5»: ищем и с номером как словом.
    if (parsed.house) queries.push({ words: [...parsed.words, parsed.house.replace(/\D.*$/, '')], withHouse: false })

    const scored: { r: MapSearchResult; score: number }[] = []
    const seen = new Set<string>()
    const kept: MapSearchResult[] = []
    // Одно и то же бывает в данных дважды: город точкой и границей (середина границы — за
    // несколько км), больница точкой и зданием. Повтор рядом — не показываем.
    const twinRadiusKm = { place: 15, street: 1.5, poi: 0.4, house: 0.05 } as const
    const push = (r: MapSearchResult, score: number) => {
      if (seen.has(r.id)) return
      const radius = twinRadiusKm[r.cls] ?? 0.1
      const twin = kept.find(
        (p) => p.cls === r.cls && p.kind === r.kind && p.name === r.name && distanceKm(p.lat, p.lon, r.lat, r.lon) < radius
      )
      if (twin) return
      seen.add(r.id)
      kept.push(r)
      scored.push({ r, score })
    }

    for (const { db, region } of await this.databases()) {
      for (const q of queries) {
        const match = ftsQuery(q.words)
        if (!match) continue
        let rows: Row[]
        try {
          rows = searchRows(db, match, q.words.length, hasPos ? { lat: opts.lat!, lon: opts.lon! } : null, cityMatch)
        } catch (err) {
          logger.warn({ err }, `[MapSearch] ошибка запроса «${match}» в ${region}`)
          continue
        }
        for (const row of rows) {
          const name = (opts.english && row.name_en) || row.name || ''
          const d = dist(row.lat, row.lon)
          const base: MapSearchResult = {
            id: `${region}:${row.id}`,
            cls: row.cls as MapSearchResult['cls'],
            kind: row.kind,
            name,
            city: row.city,
            address: row.street ? [row.street, row.house].filter(Boolean).join(', ') : null,
            lat: row.lat,
            lon: row.lon,
            distanceKm: d,
          }
          const score =
            scoreResult({ rank: row.rank, name: row.name, words: q.words, distanceKm: d, cls: row.cls, kind: row.kind }) +
            cityBonus(row.city, parsed.city)

          if (q.withHouse && parsed.house && (row.cls === 'street' || row.cls === 'place')) {
            // Дома этой улицы/посёлка: сперва точное совпадение номера, потом корпуса и строения.
            const head = parsed.house.match(/^\d+/)?.[0] ?? parsed.house
            const houses = db
              .prepare(`SELECT house, lat, lon FROM houses WHERE street_id = ? AND house LIKE ? LIMIT 50`)
              .all(row.id, `${head}%`) as { house: string; lat: number; lon: number }[]
            for (const h of houses) {
              const m = houseMatches(parsed.house, h.house)
              if (!m) continue
              const hd = dist(h.lat, h.lon)
              push(
                {
                  id: `${region}:h:${row.id}:${h.house}`,
                  cls: 'house',
                  kind: 'house',
                  name: `${name}, ${h.house}`,
                  city: row.city,
                  address: null,
                  lat: h.lat,
                  lon: h.lon,
                  distanceKm: hd,
                },
                score + (m === 'exact' ? 60 : 40)
              )
            }
          }
          push(base, score)
        }
      }
    }
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, limit).map((s) => s.r)
  }

  /** Адрес ближайшего дома (до ~60 м) — для подсказки «что здесь». */
  static async addressAt(lat: number, lon: number): Promise<{ street: string; house: string; city: string | null } | null> {
    const dLat = 0.0006
    const dLon = 0.0006 / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
    let best: { street: string; house: string; city: string | null; d: number } | null = null
    for (const { db } of await this.databases()) {
      const rows = db
        .prepare(
          `SELECT h.house, h.lat, h.lon, i.name, i.city FROM houses h JOIN items i ON i.id = h.street_id
           WHERE h.lat BETWEEN ? AND ? AND h.lon BETWEEN ? AND ? LIMIT 200`
        )
        .all(lat - dLat, lat + dLat, lon - dLon, lon + dLon) as {
        house: string
        lat: number
        lon: number
        name: string
        city: string | null
      }[]
      for (const r of rows) {
        const d = distanceKm(lat, lon, r.lat, r.lon)
        if (d <= 0.06 && (!best || d < best.d)) best = { street: r.name, house: r.house, city: r.city, d }
      }
    }
    return best ? { street: best.street, house: best.house, city: best.city } : null
  }
}

export type HereInfo = {
  /** Адрес ближайшего дома (до ~60 м). */
  address: { street: string; house: string; city: string | null } | null
  /** Места рядом (до ~150 м), ближние первыми. */
  nearby: { name: string; kind: string | null; distanceM: number; address: string | null }[]
  /** Район, микрорайон, жилой комплекс. */
  district: { name: string; kind: string | null } | null
  /** Город или посёлок. */
  settlement: { name: string; kind: string | null } | null
  /** Регион указателя (id пакета карты), где нашлось. */
  region: string | null
}

/** Радиус «принадлежности» к населённому пункту, км. */
const SETTLEMENT_REACH_KM: Record<string, number> = { city: 25, town: 8, village: 3, hamlet: 1.5, isolated_dwelling: 0.7 }
const DISTRICT_KINDS = ['suburb', 'borough', 'quarter', 'neighbourhood']

/** «Что здесь?»: всё, что скачанные указатели знают о точке. */
export async function describeHere(lat: number, lon: number): Promise<HereInfo> {
  const out: HereInfo = { address: null, nearby: [], district: null, settlement: null, region: null }
  let bestHouse = Infinity
  let bestDistrict = Infinity
  let bestSettlement = Infinity
  const box = (km: number): [number, number, number, number] => {
    const dLat = km / 111.2
    const dLon = km / (111.2 * Math.max(0.2, Math.cos((lat * Math.PI) / 180)))
    return [lat - dLat, lat + dLat, lon - dLon, lon + dLon]
  }
  for (const { db, region } of await MapSearchService.databases()) {
    const houses = db
      .prepare(
        `SELECT h.house, h.lat, h.lon, i.name, i.city FROM houses h JOIN items i ON i.id = h.street_id
         WHERE h.lat BETWEEN ? AND ? AND h.lon BETWEEN ? AND ? LIMIT 300`
      )
      .all(...box(0.06)) as { house: string; lat: number; lon: number; name: string; city: string | null }[]
    for (const h of houses) {
      const d = distanceKm(lat, lon, h.lat, h.lon)
      if (d <= 0.06 && d < bestHouse) {
        bestHouse = d
        out.address = { street: h.name, house: h.house, city: h.city }
        out.region = region
      }
    }
    const pois = db
      .prepare(
        `SELECT name, kind, street, house, lat, lon FROM items
         WHERE cls = 'poi' AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ? LIMIT 400`
      )
      .all(...box(0.15)) as {
      name: string
      kind: string | null
      street: string | null
      house: string | null
      lat: number
      lon: number
    }[]
    for (const p of pois) {
      const d = distanceKm(lat, lon, p.lat, p.lon)
      if (d > 0.15) continue
      out.nearby.push({
        name: p.name,
        kind: p.kind,
        distanceM: Math.round(d * 1000),
        address: p.street ? [p.street, p.house].filter(Boolean).join(', ') : null,
      })
      if (!out.region) out.region = region
    }
    const places = db
      .prepare(`SELECT name, kind, lat, lon FROM items WHERE cls = 'place' AND lat BETWEEN ? AND ? AND lon BETWEEN ? AND ?`)
      .all(...box(25)) as { name: string; kind: string | null; lat: number; lon: number }[]
    for (const p of places) {
      const d = distanceKm(lat, lon, p.lat, p.lon)
      if (p.kind && DISTRICT_KINDS.includes(p.kind) && d <= 2.5 && d < bestDistrict) {
        bestDistrict = d
        out.district = { name: p.name, kind: p.kind }
      }
      const reach = p.kind ? SETTLEMENT_REACH_KM[p.kind] : undefined
      if (reach && d / reach < 1 && d / reach < bestSettlement) {
        bestSettlement = d / reach
        out.settlement = { name: p.name, kind: p.kind }
        if (!out.region) out.region = region
      }
    }
  }
  // Город из адреса дома точнее «ближайшего города» (у границ городов).
  if (out.address?.city && out.settlement?.name !== out.address.city) {
    out.settlement = { name: out.address.city, kind: null }
  }
  // Ближние первыми; одно и то же место (точка и здание) — один раз.
  out.nearby.sort((a, b) => a.distanceM - b.distanceM)
  const seen = new Set<string>()
  out.nearby = out.nearby
    .filter((n) => {
      const key = `${n.kind}|${n.name}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, 10)
  return out
}

/** Для тестов и журнала: короткая подпись результата. */
export function resultLabel(r: MapSearchResult): string {
  return [r.name, r.address, r.city].filter(Boolean).map((s) => normalizeText(String(s))).join(' · ')
}
