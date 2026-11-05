import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { parseMeta4, sha256File } from '../../app/utils/meta4.js'

const SAMPLE = `<?xml version="1.0" encoding="UTF-8"?>
<metalink xmlns="urn:ietf:params:xml:ns:metalink">
  <generator>MirrorBrain</generator>
  <file name="wikipedia_ru_medicine_nopic_2026-10.zim">
    <size>139051939</size>
    <hash type="md5">0123456789abcdef0123456789abcdef</hash>
    <hash type="sha-256">ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789ABCDEF0123456789</hash>
    <url location="de" priority="1">https://ftp.fau.de/kiwix/zim/wikipedia/x.zim</url>
  </file>
</metalink>`

test('size and sha-256 are read from a Kiwix .meta4', () => {
  assert.deepEqual(parseMeta4(SAMPLE), {
    size: 139051939,
    sha256: 'abcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789',
  })
})

test('a .meta4 without sha-256 gives only the size', () => {
  assert.deepEqual(parseMeta4(SAMPLE.replace(/<hash type="sha-256">[^<]*<\/hash>/, '')), {
    size: 139051939,
  })
})

test('garbage gives an empty result', () => {
  assert.deepEqual(parseMeta4('<html>Please confirm you are human</html>'), {})
  assert.deepEqual(parseMeta4(''), {})
})

test('sha256File streams the file', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'kladez-sha-'))
  const f = join(dir, 'a.txt')
  writeFileSync(f, 'hello')
  assert.equal(
    await sha256File(f),
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  )
})
