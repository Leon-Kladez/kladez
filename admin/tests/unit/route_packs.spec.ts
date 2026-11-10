import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { create } from 'tar'

import { installedRegions, installPack, PACK_ENTRY_RE, removePack } from '../../app/utils/route_packs.js'

/** Набор дорог как из kladez-maps: кусочки графа + служебная база. */
async function makePack(dir: string, name: string, files: string[]) {
  const src = join(dir, `src-${name}`)
  for (const f of files) {
    mkdirSync(join(src, f, '..'), { recursive: true })
    writeFileSync(join(src, f), f)
  }
  const tarPath = join(dir, name)
  await create({ file: tarPath, cwd: src }, files)
  return tarPath
}

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
