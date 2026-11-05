import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import vine from '@vinejs/vine'

import {
  zimCategoriesSpecSchema,
  wikipediaSpecSchema,
  creatorPacksSpecSchema,
  bundlesSpecSchema,
  mirrorsSpecSchema,
} from '../../app/validators/curated_collections.js'

/**
 * Guards the Russian catalog shipped in collections-ru/: every file must pass the
 * schema the app validates it with, and the cross-file references (bundles ->
 * wikipedia options / tier slugs, includesTier, id+version == filename) must hold.
 * A failure here means the catalog would be silently dropped or mis-installed.
 */

const DIR = join(process.cwd(), '..', 'collections-ru')
const load = (name: string) => JSON.parse(readFileSync(join(DIR, name), 'utf-8'))

test('every collections-ru file passes its schema', async () => {
  await vine.validate({ schema: wikipediaSpecSchema, data: load('wikipedia.json') })
  await vine.validate({ schema: zimCategoriesSpecSchema, data: load('kiwix-categories.json') })
  await vine.validate({ schema: creatorPacksSpecSchema, data: load('creator-packs.json') })
  await vine.validate({ schema: bundlesSpecSchema, data: load('bundles.json') })
  await vine.validate({ schema: mirrorsSpecSchema, data: load('mirrors.json') })
})

test('bundles reference existing wikipedia options and tier slugs', () => {
  const options = new Set(load('wikipedia.json').options.map((o: any) => o.id))
  const cats = load('kiwix-categories.json').categories
  const slugs = new Set(cats.flatMap((c: any) => c.tiers.map((t: any) => t.slug)))
  for (const b of load('bundles.json').bundles) {
    assert.ok(options.has(b.wikipedia), `${b.id}: unknown wikipedia option ${b.wikipedia}`)
    for (const s of b.tiers) assert.ok(slugs.has(s), `${b.id}: unknown tier ${s}`)
  }
  for (const c of cats)
    for (const t of c.tiers)
      if (t.includesTier) assert.ok(slugs.has(t.includesTier), `${t.slug}: bad includesTier`)
})

test('resource id + version is exactly the file name in the url', () => {
  for (const c of load('kiwix-categories.json').categories)
    for (const t of c.tiers)
      for (const r of t.resources)
        assert.equal(r.url.split('/').pop(), `${r.id}_${r.version}.zim`, r.id)
})

test('every mirror base ends with /zim/', () => {
  for (const m of load('mirrors.json').kiwix.mirrors) assert.ok(m.base.endsWith('/zim/'), m.base)
})
