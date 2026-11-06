import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { list } from 'tar'
import { fileURLToPath } from 'node:url'

import { readPmtilesBounds, unionBounds, baseAssetsUpToDate } from '../../app/utils/map_packages.js'
import { KLADEZ_BASE_ASSETS_VERSION, BUNDLED_BASE_ASSETS_PATH } from '../../constants/map_regions.js'

/** Заголовок PMTiles v3 (127 байт): границы — int32 LE ×1e7 на смещениях 102, 106, 110, 114. */
function header(minLon: number, minLat: number, maxLon: number, maxLat: number) {
  const b = Buffer.alloc(127)
  b.write('PMTiles', 0, 'latin1')
  b.writeUInt8(3, 7)
  b.writeInt32LE(Math.round(minLon * 1e7), 102)
  b.writeInt32LE(Math.round(minLat * 1e7), 106)
  b.writeInt32LE(Math.round(maxLon * 1e7), 110)
  b.writeInt32LE(Math.round(maxLat * 1e7), 114)
  return b
}

test('readPmtilesBounds: границы из заголовка', () => {
  assert.deepEqual(readPmtilesBounds(header(30.5, 50.1, 60.25, 70)), [30.5, 50.1, 60.25, 70])
})

test('readPmtilesBounds: не PMTiles v3 — null', () => {
  assert.equal(readPmtilesBounds(Buffer.from('hello world')), null)
  const v2 = header(0, 0, 1, 1)
  v2.writeUInt8(2, 7)
  assert.equal(readPmtilesBounds(v2), null)
})

test('unionBounds: объединение; слишком широко (через полмира) — null', () => {
  assert.deepEqual(unionBounds([[30, 50, 40, 60], [35, 45, 50, 58]]), [30, 45, 50, 60])
  assert.equal(unionBounds([]), null)
  assert.equal(unionBounds([[-180, 40, 180, 80]]), null)
})

test('baseAssetsUpToDate: только своя метка версии', () => {
  assert.equal(baseAssetsUpToDate(KLADEZ_BASE_ASSETS_VERSION), true)
  assert.equal(baseAssetsUpToDate(`${KLADEZ_BASE_ASSETS_VERSION}\n`), true)
  assert.equal(baseAssetsUpToDate(null), false)
  assert.equal(baseAssetsUpToDate('nomad'), false)
})

test('встроенный архив содержит метку текущей версии стиля', async () => {
  const path = new URL(`../../${BUNDLED_BASE_ASSETS_PATH}`, import.meta.url)
  let marker = ''
  await list({
    file: fileURLToPath(path),
    onReadEntry: (e: any) => {
      if (e.path.endsWith('kladez-base-assets.txt')) e.on('data', (c: Buffer) => (marker += c.toString()))
      else e.resume()
    },
  })
  assert.equal(marker.trim(), KLADEZ_BASE_ASSETS_VERSION)
})
