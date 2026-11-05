import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { readBundledSpec } from '../../app/utils/bundled_catalog.js'

test('reads a bundled catalog file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kladez-cat-'))
  writeFileSync(join(dir, 'bundles.json'), JSON.stringify({ spec_version: '1', bundles: [{ id: 'a' }] }))
  const spec = (await readBundledSpec('bundles', dir)) as any
  assert.equal(spec.bundles.length, 1)
})

test('missing file returns null', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kladez-cat-'))
  assert.equal(await readBundledSpec('wikipedia', dir), null)
})

test('broken JSON returns null instead of throwing', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kladez-cat-'))
  writeFileSync(join(dir, 'mirrors.json'), '{ not json')
  assert.equal(await readBundledSpec('mirrors', dir), null)
})
