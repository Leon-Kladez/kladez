import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { bundleSizeMb, bundleTierClosure } from '../../app/utils/bundles.js'
import type { BundlesSpec, ZimCategoriesSpec } from '../../types/collections.js'

const dir = join(process.cwd(), '..', 'collections-ru')
const cats: ZimCategoriesSpec = JSON.parse(readFileSync(join(dir, 'kiwix-categories.json'), 'utf-8'))
const { bundles }: BundlesSpec = JSON.parse(readFileSync(join(dir, 'bundles.json'), 'utf-8'))
const wiki = JSON.parse(readFileSync(join(dir, 'wikipedia.json'), 'utf-8')).options
const wikiMb = (id: string) => wiki.find((o: any) => o.id === id).size_mb
const byId = (id: string) => bundles.find((b) => b.id === id)!

test('bundle sizes match the approved design', () => {
  assert.equal(bundleSizeMb(byId('aptechka'), cats, wikiMb('top-maxi')), 4460)
  assert.equal(bundleSizeMb(byId('biblioteka'), cats, wikiMb('all-nopic')), 26836)
  assert.equal(bundleSizeMb(byId('vsyo'), cats, wikiMb('all-maxi')), 62906)
})

test('a tier brings the tiers it includes, without duplicates', () => {
  assert.deepEqual(
    bundleTierClosure(['books-all', 'books-basic'], cats).map((t) => t.slug).sort(),
    ['books-all', 'books-basic', 'books-dictionary']
  )
})

test('an unknown tier slug is an error that names it', () => {
  assert.throws(() => bundleTierClosure(['no-such-tier'], cats), /no-such-tier/)
})

test('a bundle is installed only when its Wikipedia and every tier are in place', async () => {
  const { bundleStatus } = await import('../../app/utils/bundles.js')
  const apt = byId('aptechka')
  const allInstalled = {
    wikipedia: { option_id: 'top-maxi', status: 'installed' },
    installedTierByCategory: {
      medicine: 'medicine-full', // a higher tier covers medicine-basic
      education: 'education-basic',
      books: 'books-basic',
      english: 'english-basic',
    },
  }
  assert.equal(bundleStatus(apt, cats, allInstalled), 'installed')
  assert.equal(
    bundleStatus(apt, cats, { ...allInstalled, wikipedia: { option_id: 'top-maxi', status: 'downloading' } }),
    'downloading'
  )
  assert.equal(
    bundleStatus(apt, cats, { ...allInstalled, installedTierByCategory: { medicine: 'medicine-basic' } }),
    'partial'
  )
  assert.equal(
    bundleStatus(apt, cats, { wikipedia: null, installedTierByCategory: {} }),
    'none'
  )
})
