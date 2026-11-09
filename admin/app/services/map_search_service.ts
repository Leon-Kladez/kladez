// Кладезъ: поиск по карте без интернета — по указателям search-<регион>_<версия>.sqlite
// (собираются в kladez-maps, скачиваются вместе с картой). SQLite встроен в Node (node:sqlite).
import { DatabaseSync } from 'node:sqlite'
import { readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
import {
  distanceKm,
  ftsQuery,
  houseMatches,
  normalizeText,
  parseSearch,
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
function searchRows(db: DatabaseSync, match: string, wordCount: number): Row[] {
  const byName = `{name name_en words}: (${match})`
  const sql = (extra: string, limit: number) =>
    `SELECT i.* FROM items_fts JOIN items i ON i.id = items_fts.rowid
     WHERE items_fts MATCH ? ${extra} ORDER BY bm25(items_fts, 10.0, 8.0, 4.0, 1.0) LIMIT ${limit}`
  const rows = new Map<number, Row>()
  const add = (list: unknown[]) => {
    for (const r of list as Row[]) if (!rows.has(r.id)) rows.set(r.id, r)
  }
  add(db.prepare(sql(`AND i.cls = 'place'`, 30)).all(byName))
  add(db.prepare(sql('', 300)).all(byName))
  if (wordCount > 1) add(db.prepare(sql('', 300)).all(match))
  return [...rows.values()]
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

  private static async databases(): Promise<OpenDb[]> {
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
        } catch (err) {
          logger.warn({ err }, `[MapSearch] не открылся ${name}`)
          continue
        }
      }
      out.push(o)
    }
    return out
  }

  /** Есть ли хоть один указатель (для подсказки «скачайте поиск»). */
  static async available(): Promise<string[]> {
    return [...(await this.files()).keys()]
  }

  static async search(
    input: string,
    opts: { lat?: number | null; lon?: number | null; limit?: number; english?: boolean } = {}
  ): Promise<MapSearchResult[]> {
    const parsed = parseSearch(input)
    const limit = Math.min(Math.max(opts.limit ?? 20, 1), 50)
    const hasPos = Number.isFinite(opts.lat) && Number.isFinite(opts.lon)
    const dist = (lat: number, lon: number) => (hasPos ? distanceKm(opts.lat!, opts.lon!, lat, lon) : null)
    const queries: { words: string[]; withHouse: boolean }[] = [{ words: parsed.words, withHouse: !!parsed.house }]
    // «школа 5» — это и «дом 5 на улице Школьной», и «Школа № 5»: ищем и с номером как словом.
    if (parsed.house) queries.push({ words: [...parsed.words, parsed.house.replace(/\D.*$/, '')], withHouse: false })

    const scored: { r: MapSearchResult; score: number }[] = []
    const seen = new Set<string>()
    const places: MapSearchResult[] = []
    const push = (r: MapSearchResult, score: number) => {
      if (seen.has(r.id)) return
      // Один и тот же город бывает в данных дважды (точка и граница; середина границы — за
      // несколько км от центра) — показываем один раз.
      if (r.cls === 'place') {
        const twin = places.find((p) => p.kind === r.kind && p.name === r.name && distanceKm(p.lat, p.lon, r.lat, r.lon) < 15)
        if (twin) return
        places.push(r)
      } else {
        const dup = `${r.cls}|${r.kind}|${r.name}|${r.city}|${Math.round(r.lat * 20)}|${Math.round(r.lon * 20)}`
        if (seen.has(dup)) return
        seen.add(dup)
      }
      seen.add(r.id)
      scored.push({ r, score })
    }

    for (const { db, region } of await this.databases()) {
      for (const q of queries) {
        const match = ftsQuery(q.words)
        if (!match) continue
        let rows: Row[]
        try {
          rows = searchRows(db, match, q.words.length)
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
          const score = scoreResult({ rank: row.rank, name: row.name, words: q.words, distanceKm: d, cls: row.cls })

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

/** Для тестов и журнала: короткая подпись результата. */
export function resultLabel(r: MapSearchResult): string {
  return [r.name, r.address, r.city].filter(Boolean).map((s) => normalizeText(String(s))).join(' · ')
}
