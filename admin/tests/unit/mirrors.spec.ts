import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { mirrorCandidates, pickDownloadUrl } from '../../app/utils/mirrors.js'
import type { MirrorsSpec } from '../../types/collections.js'

const spec: MirrorsSpec = JSON.parse(
  readFileSync(join(process.cwd(), '..', 'collections-ru', 'mirrors.json'), 'utf-8')
)
const u = 'https://download.kiwix.org/zim/wikipedia/x_2026-10.zim'

test('Kiwix file gets the original first, then mirrors ordered by Russia check', () => {
  const c = mirrorCandidates(u, spec)
  assert.equal(c[0], u)
  assert.equal(c[1], 'https://ftp.fau.de/kiwix/zim/wikipedia/x_2026-10.zim')
  assert.equal(c[c.length - 1], 'https://mirror.download.kiwix.org/zim/wikipedia/x_2026-10.zim')
  assert.equal(c.length, 9)
})

test('each retry takes the next address and wraps around', () => {
  const fb = mirrorCandidates(u, spec).slice(1)
  assert.equal(pickDownloadUrl(u, fb, 0), u)
  assert.equal(pickDownloadUrl(u, fb, 1), 'https://ftp.fau.de/kiwix/zim/wikipedia/x_2026-10.zim')
  assert.equal(pickDownloadUrl(u, fb, 9), u)
  assert.equal(pickDownloadUrl(u, undefined, 5), u)
  assert.equal(pickDownloadUrl(u, [u, fb[0]], 1), fb[0])
})

test('non-Kiwix addresses and a missing spec get no mirrors', () => {
  assert.deepEqual(mirrorCandidates('https://api.fda.gov/download.json', spec), [
    'https://api.fda.gov/download.json',
  ])
  assert.deepEqual(mirrorCandidates(u, null), [u])
})
