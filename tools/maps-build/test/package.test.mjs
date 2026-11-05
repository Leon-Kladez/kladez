import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { sha256File, mktorrentArgs, assetUrl, buildMapsManifest, packageFilename, mergeManifests } from '../src/package.mjs'

const central = {
  id: 'ru-central', title: 'Центральный федеральный округ', group: 'russia', country: 'RU',
  contents: 'Москва и Московская область', source: { admin1: ['RU-MOW'] }, variants: ['full', 'overview'],
}
const SHA = 'a'.repeat(64)
const results = [
  { region: central, variant: 'full', filename: 'ru-central_2026-11.pmtiles', bytes: 1_099_500_000, sha256: SHA },
  { region: central, variant: 'overview', filename: 'ru-central-overview_2026-11.pmtiles', bytes: 300_000_000, sha256: SHA },
]
const opts = { repo: 'kladez/kladez-maps', tag: 'maps-2026-11', version: '2026-11', builtAt: '2026-11-04' }

test('packageFilename разбирается регуляркой parseMapFilename', () => {
  const name = packageFilename('ru-central', 'overview', '2026-11')
  assert.equal(name, 'ru-central-overview_2026-11.pmtiles')
  const m = name.replace(/\.pmtiles$/, '').match(/^(.+)_(\d{4}-\d{2})$/)
  assert.deepEqual([m[1], m[2]], ['ru-central-overview', '2026-11'])
})

test('buildMapsManifest: ресурсы, размеры, без зеркал', () => {
  const spec = buildMapsManifest(results, opts)
  assert.equal(spec.spec_version, '2026-11-04')
  assert.equal(spec.collections.length, 1)
  const c = spec.collections[0]
  assert.deepEqual([c.slug, c.name, c.language, c.icon], ['russia', 'Россия', 'ru', 'IconMap'])
  const [full, ov] = c.resources
  assert.equal(full.id, 'ru-central')
  assert.equal(ov.id, 'ru-central-overview')
  assert.equal(full.size_mb, 1100)
  assert.equal(full.version, '2026-11')
  assert.equal(full.url, 'https://github.com/kladez/kladez-maps/releases/download/maps-2026-11/ru-central_2026-11.pmtiles')
  assert.equal(full.torrent, full.url + '.torrent')
  assert.equal(full.sha256, SHA)
  assert.deepEqual([full.detail, ov.detail, full.country], ['full', 'overview', 'RU'])
  assert.equal(full.description, 'Москва и Московская область')
  assert.equal(full.contents, 'Москва и Московская область')
  assert.ok(!('mirrors' in full))
})

test('buildMapsManifest: зеркало Яндекса, если задано', () => {
  const spec = buildMapsManifest(results, { ...opts, yandexBase: 'https://storage.yandexcloud.net/kladez-maps/2026-11/' })
  assert.deepEqual(spec.collections[0].resources[0].mirrors, [
    'https://storage.yandexcloud.net/kladez-maps/2026-11/ru-central_2026-11.pmtiles',
  ])
})

test('mergeManifests склеивает группы в порядке GROUPS', () => {
  const a = buildMapsManifest(results, opts)
  const b = buildMapsManifest([{ ...results[0], region: { ...central, id: 'by', group: 'cis', country: 'BY', contents: undefined, title: 'Беларусь' }, filename: 'by_2026-11.pmtiles' }], opts)
  const m = mergeManifests([b, a])
  assert.deepEqual(m.collections.map((c) => c.slug), ['russia', 'cis'])
  assert.equal(m.collections[1].resources[0].description, 'Карта: Беларусь')
})

test('mktorrentArgs с веб-сидами', () => {
  const a = mktorrentArgs({ file: 'f.pmtiles', out: 'f.pmtiles.torrent', webseeds: ['https://a/f', 'https://b/f'] })
  assert.equal(a[a.indexOf('https://a/f') - 1], '-w')
  assert.equal(a[a.indexOf('https://b/f') - 1], '-w')
  assert.equal(a.at(-1), 'f.pmtiles')
  assert.ok(a.includes('-o'))
})

test('assetUrl', () => {
  assert.equal(assetUrl('o/r', 't', 'f'), 'https://github.com/o/r/releases/download/t/f')
})

test('sha256File', async () => {
  const p = join(mkdtempSync(join(tmpdir(), 'sha-')), 'abc')
  writeFileSync(p, 'abc')
  assert.equal(await sha256File(p), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad')
})
