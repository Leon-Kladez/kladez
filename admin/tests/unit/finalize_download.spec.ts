import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { finalizeTmp } from '../../app/utils/finalize_download.js'
import { resolveExpectedSha256 } from '../../app/utils/meta4.js'

const setup = () => {
  const dir = mkdtempSync(join(tmpdir(), 'kladez-fin-'))
  const tmp = join(dir, 'a.zim.tmp')
  const final = join(dir, 'a.zim')
  writeFileSync(tmp, 'zim bytes')
  return { tmp, final }
}

test('a verified .tmp becomes the final file', async () => {
  const { tmp, final } = setup()
  await finalizeTmp(tmp, final, async () => {})
  assert.equal(readFileSync(final, 'utf-8'), 'zim bytes')
  assert.equal(existsSync(tmp), false)
})

test('a .tmp failing verification is deleted and never becomes the final file', async () => {
  const { tmp, final } = setup()
  await assert.rejects(
    finalizeTmp(tmp, final, async () => {
      throw new Error('Checksum mismatch')
    }),
    /Checksum mismatch/
  )
  assert.equal(existsSync(final), false)
  assert.equal(existsSync(tmp), false)
})

test('without a verifier the .tmp is just renamed', async () => {
  const { tmp, final } = setup()
  await finalizeTmp(tmp, final)
  assert.equal(existsSync(final), true)
})

const META4 = '<metalink><file name="x"><size>9</size><hash type="sha-256">' + 'a'.repeat(64) + '</hash></file></metalink>'

test('expected hash given in the job wins, nothing is fetched', async () => {
  let fetched = 0
  const sha = await resolveExpectedSha256(
    { url: 'https://download.kiwix.org/zim/x/a_2026-10.zim', filetype: 'zim', expectedSha256: 'B'.repeat(64) },
    async () => (fetched++, META4)
  )
  assert.equal(sha, 'b'.repeat(64))
  assert.equal(fetched, 0)
})

test('Kiwix ZIM hash comes from the main server .meta4 even when a mirror serves the bytes', async () => {
  const asked: string[] = []
  const sha = await resolveExpectedSha256(
    { url: 'https://download.kiwix.org/zim/x/a_2026-10.zim', filetype: 'zim' },
    async (u) => (asked.push(u), META4)
  )
  assert.equal(sha, 'a'.repeat(64))
  assert.deepEqual(asked, ['https://download.kiwix.org/zim/x/a_2026-10.zim.meta4'])
})

test('no hash for non-Kiwix files or when .meta4 cannot be fetched', async () => {
  assert.equal(
    await resolveExpectedSha256({ url: 'https://example.org/a.pmtiles', filetype: 'map' }, async () => META4),
    undefined
  )
  assert.equal(
    await resolveExpectedSha256({ url: 'https://download.kiwix.org/zim/x/a_2026-10.zim', filetype: 'zim' }, async () => {
      throw new Error('ETIMEDOUT')
    }),
    undefined
  )
})
