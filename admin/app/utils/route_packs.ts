// Кладезъ: наборы дорог по регионам (routes-<регион>_<версия>.tar из kladez-maps).
// Все наборы — из одной сборки на всю страну, поэтому распаковываются в одну папку tiles;
// список файлов каждого набора хранится в packs/<регион>.files.json, чтобы при удалении
// карты убрать только те кусочки, которые не нужны другим регионам.
import { mkdir, readdir, readFile, rm, unlink, writeFile } from 'node:fs/promises'
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

/** Распаковать набор в tilesDir, записать список его кусочков, удалить сам .tar. */
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
  await writeFile(join(packsDir, `${m[1]}.files.json`), JSON.stringify({ region: m[1], version: m[2], files: tiles }))
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
    try {
      for (const f of JSON.parse(await readFile(join(packsDir, `${other}.files.json`), 'utf8')).files ?? []) shared.add(f)
    } catch {}
  }
  const root = resolve(tilesDir)
  let removed = 0
  for (const f of mine) {
    if (shared.has(f) || !PACK_ENTRY_RE.test(f)) continue
    const p = resolve(root, f)
    if (!p.startsWith(root + sep)) continue
    await unlink(p).then(
      () => removed++,
      () => {}
    )
  }
  await rm(listPath, { force: true })
  return removed
}
