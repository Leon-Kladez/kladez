import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { applyLatest, applyLatestToWikipedia } from '../../scripts/catalog/refresh_lib.js'
import type { ZimCategoriesSpec } from '../../types/collections.js'

const dir = join(process.cwd(), '..', 'collections-ru')
const cats: ZimCategoriesSpec = JSON.parse(readFileSync(join(dir, 'kiwix-categories.json'), 'utf-8'))
const wiki = JSON.parse(readFileSync(join(dir, 'wikipedia.json'), 'utf-8'))

const newer = 'https://download.kiwix.org/zim/wikipedia/wikipedia_ru_medicine_maxi_2027-01.zim'

test('a newer Kiwix build updates version, url and size only', () => {
  const latest = new Map([
    ['zim:wikipedia_ru_medicine_maxi', { version: '2027-01', download_url: newer, size_bytes: 330 * 1048576 }],
  ])
  const out = applyLatest(cats, latest)
  const before = cats.categories[0].tiers[0].resources[0]
  const after = out.categories[0].tiers[0].resources[0]
  assert.deepEqual(after, { ...before, version: '2027-01', url: newer, size_mb: 330 })
  // untouched elsewhere, input not mutated
  assert.deepEqual(out.categories[1], cats.categories[1])
  assert.equal(cats.categories[0].tiers[0].resources[0].version, before.version)
})

test('an older or missing catalog answer changes nothing', () => {
  const latest = new Map([
    ['zim:wikipedia_ru_medicine_maxi', { version: '2020-01', download_url: 'x', size_bytes: 1 }],
  ])
  assert.deepEqual(applyLatest(cats, latest), cats)
  assert.deepEqual(applyLatest(cats, new Map()), cats)
})

test('Wikipedia options are refreshed the same way', () => {
  const url = 'https://download.kiwix.org/zim/wikipedia/wikipedia_ru_all_nopic_2027-01.zim'
  const out = applyLatestToWikipedia(
    wiki,
    new Map([['zim:wikipedia_ru_all_nopic', { version: '2027-01', download_url: url, size_bytes: 18000 * 1048576 }]])
  )
  const opt = out.options.find((o: any) => o.id === 'all-nopic')
  assert.equal(opt.url, url)
  assert.equal(opt.version, '2027-01')
  assert.equal(opt.size_mb, 18000)
  assert.equal(out.options.find((o: any) => o.id === 'none').url, null)
})
