import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import vine from '@vinejs/vine'

import { mapsSpecSchema } from '../../app/validators/curated_collections.js'

/**
 * VineJS выкидывает неизвестные поля молча. Поля карт Кладезя (зеркала, сумма,
 * подробность, страна) должны пережить проверку каталога, иначе программа
 * не сможет ни сменить зеркало, ни проверить файл.
 */

const kladezResource = {
  id: 'ru-central',
  version: '2026-11',
  title: 'Центральный федеральный округ',
  description: 'Москва и Московская область',
  url: 'https://github.com/o/kladez-maps/releases/download/maps-2026-11/ru-central_2026-11.pmtiles',
  size_mb: 1100,
  sha256: 'a'.repeat(64),
  mirrors: ['https://storage.yandexcloud.net/kladez-maps/2026-11/ru-central_2026-11.pmtiles'],
  torrent: 'https://github.com/o/kladez-maps/releases/download/maps-2026-11/ru-central_2026-11.pmtiles.torrent',
  detail: 'full',
  country: 'RU',
  countries: ['RU'],
  contents: 'Москва и Московская область',
}

function spec(resource: Record<string, unknown>) {
  return {
    spec_version: '2026-11-04',
    collections: [
      { slug: 'russia', name: 'Россия', description: 'x', icon: 'IconMap', language: 'ru', resources: [resource] },
    ],
  }
}

test('поля карт Кладезя проходят проверку без потерь', async () => {
  const out = await vine.validate({ schema: mapsSpecSchema, data: spec(kladezResource) })
  assert.deepEqual(out.collections[0].resources[0], kladezResource)
})

test('неверная сумма sha256 — ошибка', async () => {
  await assert.rejects(vine.validate({ schema: mapsSpecSchema, data: spec({ ...kladezResource, sha256: 'xyz' }) }))
})

test('неверная подробность или страна — ошибка', async () => {
  await assert.rejects(vine.validate({ schema: mapsSpecSchema, data: spec({ ...kladezResource, detail: 'huge' }) }))
  await assert.rejects(vine.validate({ schema: mapsSpecSchema, data: spec({ ...kladezResource, country: 'rus' }) }))
})

test('ресурс NOMAD без новых полей проходит как раньше', async () => {
  const nomad = {
    id: 'alaska',
    version: '2025-12',
    title: 'Alaska',
    description: 'Topographic maps for the state of Alaska.',
    url: 'https://example.org/alaska_2025-12.pmtiles',
    size_mb: 684,
  }
  const out = await vine.validate({ schema: mapsSpecSchema, data: spec(nomad) })
  assert.deepEqual(out.collections[0].resources[0], nomad)
})
