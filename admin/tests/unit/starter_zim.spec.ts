import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { STARTER_ZIM } from '../../constants/kladez.js'

test('the Russian starter ZIM is in the repo and matches its recorded checksum', () => {
  const bytes = readFileSync(join(process.cwd(), '..', 'install', STARTER_ZIM.filename))
  assert.equal(createHash('sha256').update(bytes).digest('hex'), STARTER_ZIM.sha256)
})

test('every source of the starter ZIM serves the same file name', () => {
  assert.match(STARTER_ZIM.filename, /^vikidia_ru_all_nopic_\d{4}-\d{2}\.zim$/)
  for (const url of STARTER_ZIM.urls) assert.ok(url.endsWith('/' + STARTER_ZIM.filename), url)
  assert.ok(STARTER_ZIM.urls[0].includes('Leon-Kladez/kladez'), 'our repository comes first')
})
