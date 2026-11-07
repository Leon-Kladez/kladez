import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { DEFAULT_UI_MODE, effectiveUiMode, parseUiMode } from '../../app/utils/ui_mode.js'
import { libraryBooks, summarizeLibrary } from '../../app/utils/library_summary.js'
import { validateSettingValue } from '../../app/validators/settings.js'

test('режим: по умолчанию и для незнакомого значения — обычный', () => {
  assert.equal(DEFAULT_UI_MODE, 'simple')
  for (const v of [null, undefined, '', 'expert', 1, 'Advanced']) assert.equal(parseUiMode(v), 'simple', String(v))
  assert.equal(parseUiMode('advanced'), 'advanced')
  assert.equal(parseUiMode('simple'), 'simple')
})

test('режим: телефоны, которые только смотрят, всегда видят обычный', () => {
  assert.equal(effectiveUiMode('advanced', true), 'advanced')
  assert.equal(effectiveUiMode('advanced', false), 'simple')
  assert.equal(effectiveUiMode('simple', false), 'simple')
})

test('настройка ui.mode принимает только simple / advanced', () => {
  assert.equal(validateSettingValue('ui.mode', 'simple'), null)
  assert.equal(validateSettingValue('ui.mode', 'advanced'), null)
  assert.equal(validateSettingValue('ui.mode', ''), null)
  assert.notEqual(validateSettingValue('ui.mode', 'expert'), null)
  assert.notEqual(validateSettingValue('ui.mode', true), null)
})

test('библиотека: стартовый файл считается, но «почти пусто», пока нет других книг', () => {
  const starter = 'starter_ru_2026-09.zim'
  assert.deepEqual(summarizeLibrary([], starter), { books: 0, articles: 0, nearlyEmpty: true })
  // Стартовая книга (медицина) считается в счётчике, но «почти пусто» — пока нет других.
  assert.deepEqual(summarizeLibrary([{ path: `/data/${starter}`, articleCount: 387 }], starter), {
    books: 1,
    articles: 387,
    nearlyEmpty: true,
  })
  assert.deepEqual(
    summarizeLibrary(
      [
        { path: `/data/${starter}`, articleCount: 387 },
        { path: '/data/wikipedia_ru_medicine_maxi_2026-10.zim', articleCount: 32874 },
        { path: 'C:\lib\wikibooks_ru_all_nopic_2026-10.zim' },
      ],
      starter
    ),
    { books: 3, articles: 33261, nearlyEmpty: false }
  )
})

test('«Мои книги»: имя для Kiwix, размер из КБ, стартовая — последней', () => {
  const starter = 'wikipedia_ru_medicine_nopic_2026-10.zim'
  const list = libraryBooks(
    [
      { path: `/data/${starter}`, title: 'Медицинская Википедия', articleCount: 32874, size: 135793 },
      { path: '/data/wikibooks_ru_all_nopic_2026-10.zim', title: 'Викиучебник', articleCount: 7452 },
      { path: '/data/gutenberg_ru_all_2026-01.zim' },
    ],
    starter
  )
  // По-русски кириллица идёт раньше латиницы; без названия — имя файла.
  assert.deepEqual(list.map((b) => b.name), ['wikibooks_ru_all_nopic_2026-10', 'gutenberg_ru_all_2026-01', 'wikipedia_ru_medicine_nopic_2026-10'])
  assert.equal(list[1].title, 'gutenberg_ru_all_2026-01')
  assert.equal(list[2].starter, true)
  assert.equal(list[2].sizeBytes, 135793 * 1024)
  assert.equal(list[0].sizeBytes, null)
})
