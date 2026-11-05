import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  sortForPicker,
  matchesQuery,
  packagesForCountry,
  explainExtractError,
  pickerCountries,
  ruCountryName,
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
})
