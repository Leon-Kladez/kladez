import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vine from '@vinejs/vine'

import { mapsSpecSchema } from '../../app/validators/curated_collections.js'
import { packagesForCountry } from '../../app/utils/map_picker.js'
import type { MapsSpec } from '../../types/collections.js'

// Встроенный список карт (collections-ru/maps.json). До первой сборки карт — черновик:
// все пакеты с пометкой planned, программа их не скачивает.
const raw = JSON.parse(readFileSync(new URL('../../../collections-ru/maps.json', import.meta.url), 'utf8'))

test('встроенный список карт проходит проверку каталога без потерь', async () => {
  const out = (await vine.validate({ schema: mapsSpecSchema, data: raw })) as MapsSpec
  assert.deepEqual(out, raw)
})

test('Россия — округа, у каждой карты есть обзорный вариант', () => {
  const ru = packagesForCountry(raw, 'RU')
  assert.equal(ru.length, 9)
  const ids = new Set(raw.collections.flatMap((c: any) => c.resources.map((r: any) => r.id)))
  for (const r of ru) assert.ok(ids.has(`${r.id}-overview`), r.id)
})

test('черновик: все карты помечены planned, имена файлов в формате <id>_ГГГГ-ММ', () => {
  for (const c of raw.collections) {
    for (const r of c.resources) {
      if (raw.spec_version.endsWith('-draft')) assert.equal(r.planned, true, r.id)
      const name = new URL(r.url).pathname.split('/').pop() ?? ''
      assert.equal(name.replace(/_\d{4}-\d{2}\.pmtiles$/, ''), r.id)
    }
  }
})
