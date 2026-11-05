import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  mapsSpecToListing,
  downloadableResources,
  buildPackageDownloadParams,
  siblingVariantId,
  findPackages,
} from '../../app/utils/map_packages.js'
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

const pkg = {
  id: 'ru-central', version: '2026-11', title: 'ЦФО', description: '', size_mb: 1100,
  url: 'https://github.com/o/r/releases/download/maps-2026-11/ru-central_2026-11.pmtiles',
  mirrors: ['https://m1/ru-central_2026-11.pmtiles', 'https://m2/ru-central_2026-11.pmtiles'],
  sha256: 'b'.repeat(64),
}

test('buildPackageDownloadParams: зеркала по порядку, сумма, докачка', () => {
  const p = buildPackageDownloadParams(pkg, 'russia', '/storage/maps/pmtiles')
  assert.equal(p.url, pkg.url)
  assert.deepEqual(p.fallbackUrls, pkg.mirrors)
  assert.equal(p.expectedSha256, pkg.sha256)
  assert.equal(p.forceNew, false)
  assert.equal(p.filetype, 'map')
  assert.equal(p.filepath.split('\\').join('/'), '/storage/maps/pmtiles/ru-central_2026-11.pmtiles')
  assert.deepEqual(p.resourceMetadata, { resource_id: 'ru-central', version: '2026-11', collection_ref: 'russia' })
  assert.equal(p.title, 'ЦФО')
})

test('buildPackageDownloadParams: ресурс NOMAD без зеркал и суммы', () => {
  const { mirrors, sha256, ...plain } = pkg
  const p = buildPackageDownloadParams(plain, 'x', '/d')
  assert.deepEqual(p.fallbackUrls, [])
  assert.equal(p.expectedSha256, undefined)
})

test('siblingVariantId: подробно ↔ обзорно', () => {
  assert.equal(siblingVariantId('ru-central'), 'ru-central-overview')
  assert.equal(siblingVariantId('ru-central-overview'), 'ru-central')
})

test('findPackages: по id во всех коллекциях; planned и неизвестные — отдельно', () => {
  const planned = { ...pkg, id: 'ru-volga', planned: true }
  const s2: MapsSpec = { ...spec, collections: [{ ...spec.collections[0], resources: [pkg, planned] }] }
  const out = findPackages(s2, ['ru-central', 'ru-volga', 'nope'])
  assert.deepEqual(out.found.map((f) => [f.resource.id, f.collectionSlug]), [['ru-central', 'russia']])
  assert.deepEqual(out.unavailable, ['ru-volga', 'nope'])
})
