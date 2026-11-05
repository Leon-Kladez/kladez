import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { isWikipediaMainFile } from '../../app/utils/wikipedia_file.js'
import { findReplacedWikipediaFiles } from '../../app/utils/zim_filename.js'

test('main Wikipedia files of any language are recognised', () => {
  assert.equal(isWikipediaMainFile('wikipedia_ru_all_nopic_2026-10.zim'), true)
  assert.equal(isWikipediaMainFile('wikipedia_ru_top_maxi_2026-10.zim'), true)
  assert.equal(isWikipediaMainFile('wikipedia_en_top_mini_2026-06.zim'), true)
  assert.equal(
    isWikipediaMainFile('https://download.kiwix.org/zim/wikipedia/wikipedia_ru_all_maxi_2026-10.zim'),
    true
  )
})

test('topic sets, other projects and the old starter file are not the main Wikipedia', () => {
  assert.equal(isWikipediaMainFile('wikipedia_ru_medicine_maxi_2026-10.zim'), false)
  assert.equal(isWikipediaMainFile('wikibooks_ru_all_maxi_2026-10.zim'), false)
  assert.equal(isWikipediaMainFile('wikipedia_en_100_mini_2026-01.zim'), false)
})

test('older build of the Russian Wikipedia is cleaned up after an update', () => {
  assert.deepEqual(
    findReplacedWikipediaFiles('wikipedia_ru_all_nopic_2027-01.zim', [
      'wikipedia_ru_all_nopic_2026-10.zim',
      'wikipedia_ru_all_nopic_2027-01.zim',
      'wikipedia_ru_medicine_maxi_2026-10.zim',
    ]),
    ['wikipedia_ru_all_nopic_2026-10.zim']
  )
})
