import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { mapsSpecToListing, downloadableResources } from '../../app/utils/map_packages.js'
import type { MapsSpec } from '../../types/collections.js'

const spec: MapsSpec = {
  spec_version: '2026-11-04',
  collections: [
    {
      slug: 'russia', name: 'Россия', description: '', icon: 'IconMap', language: 'ru',
      resources: [
        { id: 'ru-central', version: '2026-11', title: 'ЦФО', description: '', size_mb: 1100,
          url: 'https://github.com/o/r/releases/download/maps-2026-11/ru-central_2026-11.pmtiles' },
      ],
    },
  ],
}

test('mapsSpecToListing: имя файла, адрес и размер из нашего списка карт', () => {
  assert.deepEqual(mapsSpecToListing(spec), [
    { name: 'ru-central_2026-11.pmtiles', download_url: spec.collections[0].resources[0].url, size: 1_100_000_000 },
  ])
})

test('mapsSpecToListing: нет списка — пусто', () => {
  assert.deepEqual(mapsSpecToListing(null), [])
})

test('карты с пометкой planned не скачиваются и не считаются обновлением', () => {
  const r = spec.collections[0].resources[0]
  const planned = { ...r, id: 'ru-volga', planned: true, url: r.url.replace('ru-central', 'ru-volga') }
  const s2: MapsSpec = { ...spec, collections: [{ ...spec.collections[0], resources: [r, planned] }] }
  assert.deepEqual(downloadableResources(s2.collections[0].resources).map((x) => x.id), ['ru-central'])
  assert.deepEqual(mapsSpecToListing(s2).map((x) => x.name), ['ru-central_2026-11.pmtiles'])
})
