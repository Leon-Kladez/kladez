import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import {
  BUNDLED_FETCHED_AT_ISO,
  bundledCatalogDir,
  readBundledSpec,
  validateBundledSpec,
} from '../../app/utils/bundled_catalog.js'

/**
 * Loads the built-in catalog exactly like the running app: the image has
 * WORKDIR /app and the files at /app/collections-ru (Dockerfile COPY), so the
 * directory is resolved from the process cwd, then each file goes through the
 * same VineJS schema the service uses.
 */
const REPO_CATALOG = join(process.cwd(), '..', 'collections-ru')

function fakeImageRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'kladez-app-'))
  // File by file: fs.cpSync crashes Node 24 on Windows when the source path
  // has non-ASCII characters (the repo lives under D:\ПРОЕКТЫ\…).
  mkdirSync(join(root, 'collections-ru'))
  for (const name of readdirSync(REPO_CATALOG)) {
    copyFileSync(join(REPO_CATALOG, name), join(root, 'collections-ru', name))
  }
  return root
}

test('in the image the catalog is looked up at <cwd>/collections-ru (= /app/collections-ru)', () => {
  assert.equal(bundledCatalogDir('/app'), join('/app', 'collections-ru'))
})

test('every built-in catalog file loads and validates through the runtime path', async () => {
  const dir = bundledCatalogDir(fakeImageRoot())
  for (const type of ['wikipedia', 'zim_categories', 'maps', 'bundles', 'mirrors', 'creator_packs'] as const) {
    const data = await readBundledSpec(type, dir)
    assert.ok(data, `${type}: file missing`)
    const result = await validateBundledSpec(type, data)
    assert.ok(result.ok, `${type}: ${result.ok ? '' : result.error}`)
  }
})

test('an invalid file reports what is wrong instead of an empty message', async () => {
  const result = await validateBundledSpec('wikipedia', { spec_version: '1', options: [{ id: 'x' }] })
  assert.equal(result.ok, false)
  assert.match((result as any).error, /name|description|size_mb/)
})

test('the cache timestamp of the built-in copy fits a MySQL TIMESTAMP column', () => {
  const ms = Date.parse(BUNDLED_FETCHED_AT_ISO)
  // MySQL TIMESTAMP: 1970-01-01 00:00:01 UTC … 2038-01-19 03:14:07 UTC. Epoch 0 is rejected.
  assert.ok(ms >= Date.parse('1970-01-01T00:00:01Z') && ms <= Date.parse('2038-01-19T03:14:07Z'))
})
