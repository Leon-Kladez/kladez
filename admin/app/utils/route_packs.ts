// Кладезъ: наборы дорог по регионам (routes-<регион>_<версия>.tar из kladez-maps).
// Все наборы — из одной сборки на всю страну, поэтому распаковываются в одну папку tiles;
// список файлов каждого набора хранится в packs/<регион>.files.json, чтобы при удалении
// карты убрать только те кусочки, которые не нужны другим регионам.
import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises'
import { join, resolve, sep } from 'node:path'
import { extract, list } from 'tar'

export const ROUTES_FILE_RE = /^routes-([a-z0-9-]+)_(\d{4}-\d{2})\.tar$/
/** Что можно распаковать: кусочки графа Valhalla и служебные базы — и ничего за пределами папки. */
export const PACK_ENTRY_RE = /^(?:\d\/(?:\d{3}\/)*\d{3}\.gph|admins\.sqlite|timezones\.sqlite)$/

export async function installedRegions(packsDir: string): Promise<string[]> {
  try {
    return (await readdir(packsDir))
      .filter((n) => n.endsWith('.files.json'))
      .map((n) => n.replace(/\.files\.json$/, ''))
      .sort()
  } catch {
    return []
  }
}

/** Установленный набор: регион, версия и отпечаток архива (sha256; у наборов до 0.1.18 его нет). */
export type InstalledPack = { region: string; version: string; sha256: string | null }

export async function installedPacks(packsDir: string): Promise<InstalledPack[]> {
  const out: InstalledPack[] = []
  for (const region of await installedRegions(packsDir)) {
    try {
      const j = JSON.parse(await readFile(join(packsDir, `${region}.files.json`), 'utf8'))
      out.push({ region, version: String(j.version ?? ''), sha256: typeof j.sha256 === 'string' ? j.sha256 : null })
    } catch {
      out.push({ region, version: '', sha256: null })
    }
  }
  return out
}

/**
 * Наборы, для которых в списке карт лежит другой файл (новая сборка дорог). Наборы разных сборок
 * плохо стыкуются на границах регионов, поэтому обновлять нужно все сразу.
 * available — отпечаток файла дорог из списка карт по региону набора.
 */
export function outdatedPacks(installed: InstalledPack[], available: Map<string, string | undefined>): string[] {
  return installed
    .filter((p) => {
      const sha = available.get(p.region)
      return sha !== undefined && p.sha256 !== sha
    })
    .map((p) => p.region)
}

/**
 * Наборы без отпечатка поставлены версией до 0.1.18. В выпуске maps-2026-11 наборы дорог заменены
 * новой сборкой 12 ноября 2026 к 22:00 UTC; старых файлов после этого на сервере нет, так что
 * набор, поставленный позже, — точно новый. Таким дописываем отпечаток из списка карт, чтобы
 * Кладезъ не качал их заново; поставленные раньше остаются без отпечатка — они устарели.
 */
export const ROUTES_2026_11_REBUILT_AT = Date.parse('2026-11-12T22:00:00Z')

export async function adoptLegacyPacks(
  packsDir: string,
  available: Map<string, string | undefined>,
  since = ROUTES_2026_11_REBUILT_AT
): Promise<string[]> {
  const adopted: string[] = []
  for (const p of await installedPacks(packsDir)) {
    const sha = available.get(p.region)
    if (p.sha256 || !sha || p.version !== '2026-11') continue
    const path = join(packsDir, `${p.region}.files.json`)
    try {
      const { mtimeMs } = await stat(path)
      if (mtimeMs < since) continue
      const j = JSON.parse(await readFile(path, 'utf8'))
      await writeFile(path, JSON.stringify({ ...j, sha256: sha }))
      adopted.push(p.region)
    } catch {}
  }
  return adopted
}

function sha256File(path: string): Promise<string> {
  return new Promise((ok, fail) => {
    const h = createHash('sha256')
    createReadStream(path)
      .on('data', (c) => h.update(c))
      .on('error', fail)
      .on('end', () => ok(h.digest('hex')))
  })
}

async function packFiles(packsDir: string, region: string): Promise<string[]> {
  try {
    return JSON.parse(await readFile(join(packsDir, `${region}.files.json`), 'utf8')).files ?? []
  } catch {
    return []
  }
}

/**
 * Распаковать набор в tilesDir, записать список его кусочков и отпечаток, удалить сам .tar.
 * Набор может быть сжат gzip (имя всё равно .tar) — библиотека tar распознаёт сжатие сама.
 * Если этот регион уже стоял (обновление), его кусочки, которых нет в новом наборе и нет у
 * других регионов, удаляются — чтобы не смешивались кусочки старой и новой сборки.
 */
export async function installPack(
  tarPath: string,
  tilesDir: string,
  packsDir: string
): Promise<{ region: string; version: string; files: number } | null> {
  const name = tarPath.split(/[\\/]/).pop() ?? ''
  const m = ROUTES_FILE_RE.exec(name)
  if (!m) return null
  await mkdir(tilesDir, { recursive: true })
  await mkdir(packsDir, { recursive: true })
  const sha256 = await sha256File(tarPath)
  const previous = await packFiles(packsDir, m[1])
  const entries: string[] = []
  await list({
    file: tarPath,
    onReadEntry: (entry) => {
      if (entry.type === 'File') entries.push(entry.path.replace(/^\.\//, ''))
    },
  })
  const safe = new Set(entries.filter((p) => PACK_ENTRY_RE.test(p)))
  await extract({ file: tarPath, cwd: tilesDir, filter: (p) => safe.has(p.replace(/^\.\//, '')) })
  const tiles = [...safe].filter((p) => p.endsWith('.gph')).sort()
  if (previous.length > 0) {
    const keep = new Set(tiles)
    for (const other of await installedRegions(packsDir)) {
      if (other === m[1]) continue
      for (const f of await packFiles(packsDir, other)) keep.add(f)
    }
    await removeFiles(tilesDir, previous.filter((f) => !keep.has(f)))
  }
  await writeFile(join(packsDir, `${m[1]}.files.json`), JSON.stringify({ region: m[1], version: m[2], sha256, files: tiles }))
  await unlink(tarPath).catch(() => {})
  return { region: m[1], version: m[2], files: tiles.length }
}

/** Убрать набор региона: только кусочки, которых нет у других установленных наборов. */
export async function removePack(region: string, tilesDir: string, packsDir: string): Promise<number> {
  const listPath = join(packsDir, `${region}.files.json`)
  let mine: string[] = []
  try {
    mine = JSON.parse(await readFile(listPath, 'utf8')).files ?? []
  } catch {
    return 0
  }
  const shared = new Set<string>()
  for (const other of await installedRegions(packsDir)) {
    if (other === region) continue
    for (const f of await packFiles(packsDir, other)) shared.add(f)
  }
  const removed = await removeFiles(tilesDir, mine.filter((f) => !shared.has(f)))
  await rm(listPath, { force: true })
  return removed
}

/** Удалить кусочки графа из tilesDir (только .gph/служебные базы и только внутри папки). */
async function removeFiles(tilesDir: string, files: string[]): Promise<number> {
  const root = resolve(tilesDir)
  let removed = 0
  for (const f of files) {
    if (!PACK_ENTRY_RE.test(f)) continue
    const p = resolve(root, f)
    if (!p.startsWith(root + sep)) continue
    await unlink(p).then(
      () => removed++,
      () => {}
    )
  }
  return removed
}
