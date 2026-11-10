import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapRegionKey, missingRegionIds, oneVariantPerRegion } from '../../constants/map_variants.js'

const set = [
  { id: 'ru-central' },
  { id: 'ru-central-overview' },
  { id: 'ru-volga-west' },
  { id: 'ru-volga-west-overview' },
  { id: 'ru-ural', planned: true },
  { id: 'ru-ural-overview', planned: true },
]

test('mapRegionKey: обзорный вариант — тот же регион', () => {
  assert.equal(mapRegionKey('ru-central-overview'), 'ru-central')
  assert.equal(mapRegionKey('ru-central'), 'ru-central')
})

test('набор считается по регионам: два варианта — один регион, черновые не считаются', () => {
  assert.deepEqual(oneVariantPerRegion(set, new Set()).map((r) => r.id), ['ru-central', 'ru-volga-west'])
  // Стоит обзорный — регион скачан, им он и считается.
  assert.deepEqual(oneVariantPerRegion(set, new Set(['ru-central-overview'])).map((r) => r.id), [
    'ru-central-overview',
    'ru-volga-west',
  ])
})

test('кнопка набора качает только недостающие регионы и только подробно', () => {
  assert.deepEqual(missingRegionIds(set, new Set()), ['ru-central', 'ru-volga-west'])
  assert.deepEqual(missingRegionIds(set, new Set(['ru-central', 'ru-volga-west-overview'])), [])
})

test('качающийся вариант учитывается вместо подробного', () => {
  const busy = (r: { id: string }) => r.id === 'ru-volga-west-overview'
  assert.deepEqual(oneVariantPerRegion(set, new Set(), busy).map((r) => r.id), ['ru-central', 'ru-volga-west-overview'])
})
