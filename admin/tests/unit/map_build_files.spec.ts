import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { BUNDLED_BASE_ASSETS_PATH } from '../../constants/map_regions.js'

// Образ Docker получает только папку build/ — встроенный архив карты должен туда копироваться.
test('adonisrc копирует встроенный архив карты в сборку', () => {
  const rc = readFileSync(new URL('../../adonisrc.ts', import.meta.url), 'utf8')
  const dir = BUNDLED_BASE_ASSETS_PATH.split('/').slice(0, -1).join('/')
  assert.ok(rc.includes(`pattern: '${dir}/**'`), `в metaFiles нет '${dir}/**'`)
})
