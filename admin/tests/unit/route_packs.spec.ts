import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { create } from 'tar'

import {
  adoptLegacyPacks,
  installedPacks,
  installedRegions,
  installPack,
  outdatedPacks,
  PACK_ENTRY_RE,
  removePack,
} from '../../app/utils/route_packs.js'

/** Набор дорог как из kladez-maps: кусочки графа + служебная база. */
async function makePack(dir: string, name: string, files: string[], opts: { gzip?: boolean; body?: string } = {}) {
  const src = join(dir, `src-${name}-${opts.body ?? ''}`)
  for (const f of files) {
    mkdirSync(join(src, f, '..'), { recursive: true })
    writeFileSync(join(src, f), `${f}${opts.body ?? ''}`)
  }
  const tarPath = join(dir, name)
  await create({ file: tarPath, cwd: src, gzip: opts.gzip ?? false }, files)
  return tarPath
}

const sha = (path: string) => createHash('sha256').update(readFileSync(path)).digest('hex')

test('что можно распаковывать', () => {
  assert.ok(PACK_ENTRY_RE.test('2/000/755/193.gph'))
  assert.ok(PACK_ENTRY_RE.test('0/003/015.gph'))
  assert.ok(PACK_ENTRY_RE.test('admins.sqlite'))
  assert.ok(!PACK_ENTRY_RE.test('../evil.gph'))
  assert.ok(!PACK_ENTRY_RE.test('2/000/../../x.gph'))
  assert.ok(!PACK_ENTRY_RE.test('start.sh'))
})

test('наборы складываются в одну папку; удаление не трогает общие кусочки', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-routes-'))
  try {
    const tiles = join(dir, 'tiles')
    const packs = join(dir, 'packs')
    const shared = '2/000/800/001.gph' // кусочек на границе — в обоих наборах
    const a = await makePack(dir, 'routes-ru-central_2026-11.tar', ['2/000/800/000.gph', shared, '1/012/345.gph', 'admins.sqlite'])
    const b = await makePack(dir, 'routes-ru-volga_2026-11.tar', [shared, '2/000/800/002.gph'])

    assert.deepEqual(await installPack(a, tiles, packs), { region: 'ru-central', version: '2026-11', files: 3 })
    assert.deepEqual(await installPack(b, tiles, packs), { region: 'ru-volga', version: '2026-11', files: 2 })
    assert.deepEqual(await installedRegions(packs), ['ru-central', 'ru-volga'])
    assert.ok(existsSync(join(tiles, shared)))
    assert.ok(existsSync(join(tiles, 'admins.sqlite')))
    assert.ok(!existsSync(a), 'архив после распаковки удалён')

    // Удаляем Центр: его собственные кусочки уходят, общий с Поволжьем — остаётся.
    assert.equal(await removePack('ru-central', tiles, packs), 2)
    assert.ok(!existsSync(join(tiles, '2/000/800/000.gph')))
    assert.ok(existsSync(join(tiles, shared)))
    assert.ok(existsSync(join(tiles, '2/000/800/002.gph')))
    assert.deepEqual(await installedRegions(packs), ['ru-volga'])

    // Не наш файл — не трогаем.
    assert.equal(await installPack(join(dir, 'other.tar'), tiles, packs), null)
    assert.equal(await removePack('nope', tiles, packs), 0)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('лишнее в архиве (скрипты, выход из папки) не распаковывается', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-routes-'))
  try {
    const tiles = join(dir, 'tiles')
    const packs = join(dir, 'packs')
    const t = await makePack(dir, 'routes-ru-south_2026-11.tar', ['2/000/900/000.gph', 'start.sh'])
    await installPack(t, tiles, packs)
    assert.ok(existsSync(join(tiles, '2/000/900/000.gph')))
    assert.ok(!existsSync(join(tiles, 'start.sh')))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('сжатый gzip набор с именем .tar распаковывается', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-routes-'))
  try {
    const tiles = join(dir, 'tiles')
    const packs = join(dir, 'packs')
    const t = await makePack(dir, 'routes-de-south_2026-11.tar', ['2/000/700/000.gph', 'admins.sqlite'], { gzip: true })
    assert.equal(readFileSync(t)[0], 0x1f, 'архив действительно сжат')
    assert.deepEqual(await installPack(t, tiles, packs), { region: 'de-south', version: '2026-11', files: 1 })
    assert.equal(readFileSync(join(tiles, '2/000/700/000.gph'), 'utf8'), '2/000/700/000.gph')
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('новая сборка дорог: отпечаток, «устарели», обновление убирает кусочки старой сборки', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-routes-'))
  try {
    const tiles = join(dir, 'tiles')
    const packs = join(dir, 'packs')
    const shared = '2/000/800/001.gph'
    const a1 = await makePack(dir, 'routes-ru-central_2026-11.tar', ['2/000/800/000.gph', shared, '2/000/800/009.gph'], { body: 'old' })
    const shaA1 = sha(a1)
    const b = await makePack(dir, 'routes-ru-volga_2026-11.tar', [shared, '2/000/800/002.gph'], { body: 'old' })
    const shaB = sha(b)
    await installPack(a1, tiles, packs)
    await installPack(b, tiles, packs)
    assert.deepEqual(await installedPacks(packs), [
      { region: 'ru-central', version: '2026-11', sha256: shaA1 },
      { region: 'ru-volga', version: '2026-11', sha256: shaB },
    ])

    // В списке карт — та же сборка: обновлять нечего; другой файл у Центра — Центр устарел.
    const same = new Map([['ru-central', shaA1], ['ru-volga', shaB]])
    assert.deepEqual(outdatedPacks(await installedPacks(packs), same), [])
    const a2 = await makePack(dir, 'routes-ru-central_2026-11.tar', ['2/000/800/000.gph', shared], { body: 'new' })
    const newer = new Map([['ru-central', sha(a2)], ['ru-volga', shaB]])
    assert.deepEqual(outdatedPacks(await installedPacks(packs), newer), ['ru-central'])
    // Набор без отпечатка (поставлен до 0.1.18) — тоже устарел; регион не из списка карт — не трогаем.
    assert.deepEqual(outdatedPacks([{ region: 'ru-volga', version: '2026-11', sha256: null }], newer), ['ru-volga'])
    assert.deepEqual(outdatedPacks([{ region: 'xx', version: '2026-11', sha256: null }], newer), [])

    // Обновление Центра: новые кусочки поверх, кусочек, которого нет в новом наборе, удалён,
    // общий с Поволжьем остаётся (и он уже новый).
    await installPack(a2, tiles, packs)
    assert.ok(!existsSync(join(tiles, '2/000/800/009.gph')), 'кусочек старой сборки удалён')
    assert.equal(readFileSync(join(tiles, '2/000/800/000.gph'), 'utf8'), '2/000/800/000.gphnew')
    assert.ok(existsSync(join(tiles, shared)))
    assert.ok(existsSync(join(tiles, '2/000/800/002.gph')))
    assert.deepEqual(outdatedPacks(await installedPacks(packs), newer), [])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})

test('наборы без отпечатка (до 0.1.18): поставленные после новой сборки — новые, раньше — устарели', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kz-routes-'))
  try {
    const packs = join(dir, 'packs')
    mkdirSync(packs)
    const write = (region: string, at: string) => {
      const p = join(packs, `${region}.files.json`)
      writeFileSync(p, JSON.stringify({ region, version: '2026-11', files: ['2/000/1.gph'] }))
      const t = new Date(at)
      utimesSync(p, t, t)
    }
    write('ru-central', '2026-11-12T23:27:00Z') // поставлен ночью 13 ноября — уже новая сборка
    write('ru-volga', '2026-11-10T12:00:00Z') // поставлен 10 ноября — старая сборка
    const available = new Map([['ru-central', 'aaa'], ['ru-volga', 'bbb']])
    assert.deepEqual(await adoptLegacyPacks(packs, available), ['ru-central'])
    assert.deepEqual(outdatedPacks(await installedPacks(packs), available), ['ru-volga'])
    // Повторно ничего не меняет.
    assert.deepEqual(await adoptLegacyPacks(packs, available), [])
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
})
