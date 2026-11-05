import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  sortForPicker,
  matchesQuery,
  packagesForCountry,
  explainExtractError,
  pickerCountries,
  ruCountryName,
  selectionSummary,
  formatMapVersion,
  versionFromFilename,
  restoreSelection,
} from '../../app/utils/map_picker.js'
import type { Country } from '../../types/maps.js'
import type { MapsSpec, SpecResource } from '../../types/collections.js'

const c = (code: string, name: string, nameRu: string): Country => ({
  code, code3: code, name, nameRu, continent: 'Europe', subregion: '', population: 0,
})
const DE = c('DE', 'Germany', 'Германия')
const KZ = c('KZ', 'Kazakhstan', 'Казахстан')
const RU = c('RU', 'Russia', 'Россия')
const AT = c('AT', 'Austria', 'Австрия')

const res = (id: string, country: string, detail: 'full' | 'overview'): SpecResource => ({
  id, version: '2026-11', title: id, description: '', url: `https://x/${id}_2026-11.pmtiles`, size_mb: 1, country, detail,
})
const RU_IDS = ['ru-central', 'ru-northwest', 'ru-south', 'ru-north-caucasus', 'ru-volga', 'ru-urals', 'ru-siberia', 'ru-far-east']
const spec: MapsSpec = {
  spec_version: '2026-11-04',
  collections: [
    { slug: 'russia', name: 'Россия', description: '', icon: 'IconMap', language: 'ru',
      resources: RU_IDS.flatMap((id) => [res(id, 'RU', 'full'), res(`${id}-overview`, 'RU', 'overview')]) },
    { slug: 'cis', name: 'СНГ', description: '', icon: 'IconMap', language: 'ru', resources: [res('kz', 'KZ', 'full')] },
  ],
}

test('sortForPicker: сначала СНГ в заданном порядке, потом остальные по-русски', () => {
  assert.deepEqual(sortForPicker([DE, KZ, RU, AT]).map((x) => x.code), ['RU', 'KZ', 'AT', 'DE'])
})

test('matchesQuery: по-русски, по-английски и по коду', () => {
  assert.ok(matchesQuery(KZ, 'каз'))
  assert.ok(matchesQuery(KZ, 'KAZ'))
  assert.ok(matchesQuery(KZ, 'kz'))
  assert.ok(!matchesQuery(KZ, 'герм'))
  assert.ok(matchesQuery(KZ, '  '), 'пустой запрос — подходит всё')
})

test('matchesQuery: прежние формы названий тоже находятся', () => {
  const BY = c('BY', 'Belarus', 'Беларусь')
  assert.ok(matchesQuery(BY, 'белорус'))
  assert.ok(matchesQuery(BY, 'белар'))
  assert.ok(matchesQuery(c('KG', 'Kyrgyzstan', 'Кыргызстан'), 'киргиз'))
})

test('ruCountryName: названия как в списке карт', () => {
  assert.equal(ruCountryName('BY', 'Белоруссия'), 'Беларусь')
  assert.equal(ruCountryName('MD', 'Молдавия'), 'Молдова')
  assert.equal(ruCountryName('DE', 'Германия'), 'Германия')
})

test('matchesQuery: «ё» и «е» одинаковы', () => {
  assert.ok(matchesQuery(c('XX', 'X', 'Королёвство'), 'королев'))
  assert.ok(matchesQuery(c('XX', 'X', 'Королевство'), 'королёв'))
})

test('packagesForCountry: 8 округов России без обзорных вариантов', () => {
  const ru = packagesForCountry(spec, 'RU')
  assert.deepEqual(ru.map((r) => r.id), RU_IDS)
  assert.deepEqual(packagesForCountry(spec, 'FR'), [])
  assert.deepEqual(packagesForCountry(null, 'RU'), [])
})

test('пакет на две страны находится по обеим (Израиль и Палестина)', () => {
  const ip: SpecResource = { ...res('israel-palestine', 'IL', 'full'), countries: ['IL', 'PS'] }
  const s2: MapsSpec = { spec_version: 'x', collections: [{ ...spec.collections[1], resources: [ip] }] }
  assert.deepEqual(packagesForCountry(s2, 'PS').map((r) => r.id), ['israel-palestine'])
  assert.deepEqual(pickerCountries([c('PS', 'Palestine', 'Палестина')], s2).map((x) => x.hasPackages), [true])
})

test('pickerCountries: отметка «есть готовые карты» берётся из списка карт', () => {
  const out = pickerCountries([DE, KZ, RU], spec)
  assert.deepEqual(out.map((x) => [x.code, x.hasPackages]), [['RU', true], ['KZ', true], ['DE', false]])
})

test('explainExtractError: недоступность мировой карты → ключ про VPN', () => {
  for (const s of [
    'Get "https://build.protomaps.com/20261104.pmtiles": dial tcp 1.2.3.4:443: i/o timeout',
    'read tcp: connection reset by peer',
    'ECONNREFUSED',
    'unexpected status 403',
    'context deadline exceeded',
  ]) {
    assert.equal(explainExtractError(s), 'maps.error.protomapsUnreachable', s)
  }
  assert.equal(explainExtractError('no space left on device'), 'maps.error.extractFailed')
  // Числа 500–599 в выводе pmtiles (плитки, размеры) — не ошибка сети.
  assert.equal(explainExtractError('wrote 512 tiles, 550 directories; error: invalid region file'), 'maps.error.extractFailed')
  assert.equal(explainExtractError('HTTP 503 Service Unavailable'), 'maps.error.protomapsUnreachable')
})

const sized = (id: string, mb: number, extra: Partial<SpecResource> = {}): SpecResource => ({ ...res(id, 'RU', 'full'), size_mb: mb, ...extra })

test('selectionSummary: не хватает места — сколько именно', () => {
  const all = [sized('ru-central', 1100), sized('ru-volga', 1100)]
  const s = selectionSummary(all, 'full', all, 1_000_000_000)
  assert.deepEqual(s.ids, ['ru-central', 'ru-volga'])
  assert.equal(s.bytes, 2_200_000_000)
  assert.equal(s.enough, false)
  assert.equal(s.missingBytes, 1_200_000_000)
})

test('selectionSummary: обзорно подставляет -overview, если он есть', () => {
  const full = [sized('ru-central', 1100), sized('ru-volga', 1100)]
  const all = [...full, sized('ru-central-overview', 275, { detail: 'overview' })]
  const s = selectionSummary(full, 'overview', all, 10_000_000_000)
  assert.deepEqual(s.ids, ['ru-central-overview', 'ru-volga'])
  assert.equal(s.bytes, 1_375_000_000)
  assert.equal(s.enough, true)
  assert.equal(s.missingBytes, 0)
})

test('selectionSummary: свободное место неизвестно — не блокируем', () => {
  const all = [sized('ru-central', 1100)]
  assert.equal(selectionSummary(all, 'full', all, null).enough, true)
})

test('formatMapVersion: «Карта от октября 2026»', () => {
  assert.equal(formatMapVersion('2026-10'), 'Карта от октября 2026')
  assert.equal(formatMapVersion('2026-05'), 'Карта от мая 2026')
  assert.equal(formatMapVersion('nonsense'), '')
})

test('versionFromFilename', () => {
  assert.equal(versionFromFilename('ru-central_2026-11.pmtiles'), '2026-11')
  assert.equal(versionFromFilename('ru_20261104_z15.pmtiles'), '2026-11')
  assert.equal(versionFromFilename('world.pmtiles'), null)
})

test('pickerCountries: значок «готовые карты» только при опубликованных пакетах', () => {
  const planned: MapsSpec = { spec_version: 'x', collections: [{ ...spec.collections[1], resources: [{ ...res('kz', 'KZ', 'full'), planned: true }] }] }
  assert.deepEqual(pickerCountries([KZ], planned).map((x) => x.hasPackages), [false])
})

test('selectionSummary: неопубликованный обзорный вариант не подставляется', () => {
  const full = [sized('ru-central', 1100)]
  const all = [...full, sized('ru-central-overview', 275, { detail: 'overview', planned: true })]
  const s = selectionSummary(full, 'overview', all, null)
  assert.deepEqual(s.ids, ['ru-central'])
  assert.deepEqual(s.noOverview, ['ru-central'])
  assert.deepEqual(selectionSummary(full, 'overview', full, null).noOverview, ['ru-central'])
  assert.deepEqual(selectionSummary(full, 'full', all, null).noOverview, [])
})

test('restoreSelection: возврат к шагу восстанавливает выбор и подробность', () => {
  assert.deepEqual(restoreSelection([]), { selected: [], detail: 'full' })
  assert.deepEqual(restoreSelection(['ru-central-overview', 'ru-volga-overview']), { selected: ['ru-central', 'ru-volga'], detail: 'overview' })
  assert.deepEqual(restoreSelection(['ru-central']), { selected: ['ru-central'], detail: 'full' })
})
