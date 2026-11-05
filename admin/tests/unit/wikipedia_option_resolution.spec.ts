import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { wikipediaOptionToResource } from '../../app/utils/wikipedia_option_resolution.js'
import { resolveZimDownload } from '../../app/utils/zim_download_resolution.js'

const option = {
  id: 'all-nopic',
  name: 'Вся Википедия без картинок',
  description: 'Все статьи целиком, без картинок.',
  size_mb: 17577,
  url: 'https://download.kiwix.org/zim/wikipedia/wikipedia_ru_all_nopic_2026-10.zim',
  version: '2026-10',
}

test('option becomes a catalog resource keyed by its file name', () => {
  const r = wikipediaOptionToResource(option)!
  assert.equal(r.id, 'wikipedia_ru_all_nopic')
  assert.equal(r.version, '2026-10')
  assert.equal(r.size_mb, 17577)
  assert.equal(r.url, option.url)
})

test('a newer Kiwix version replaces a stale catalog link', () => {
  const newer = 'https://download.kiwix.org/zim/wikipedia/wikipedia_ru_all_nopic_2027-01.zim'
  const resolved = resolveZimDownload(wikipediaOptionToResource(option)!, {
    version: '2027-01',
    download_url: newer,
    size_bytes: 1,
  })
  assert.equal(resolved.url, newer)
  assert.equal(resolved.version, '2027-01')
})

test('without a catalog answer the original link is kept', () => {
  assert.equal(resolveZimDownload(wikipediaOptionToResource(option)!, null).url, option.url)
})

test('a file name without a YYYY-MM version is not resolvable', () => {
  assert.equal(
    wikipediaOptionToResource({ ...option, url: 'https://example.org/something.zim' }),
    null
  )
})
