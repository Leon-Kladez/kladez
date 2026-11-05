import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { en, ru, t, tIn, formatBytes, formatDate, formatDateTime, formatNumber, formatDecimal, countryName, languageName, LOCALE } from '../../constants/i18n/index.js'

test('plural: русские формы', () => {
  assert.equal(t('test.files', { count: 1 }), '1 файл')
  assert.equal(t('test.files', { count: 3 }), '3 файла')
  assert.equal(t('test.files', { count: 5 }), '5 файлов')
  assert.equal(t('test.files', { count: 11 }), '11 файлов')
  assert.equal(t('test.files', { count: 21 }), '21 файл')
  assert.equal(t('test.files', { count: 112 }), '112 файлов')
})

test('plural: английские формы', () => {
  assert.equal(tIn('en', 'test.files', { count: 1 }), '1 file')
  assert.equal(tIn('en', 'test.files', { count: 2 }), '2 files')
})

test('подстановка', () => assert.equal(t('test.hello', { name: 'Анна' }), 'Здравствуйте, Анна'))

test('нет ключа — возвращается ключ', () => assert.equal(t('no.such.key' as any), 'no.such.key'))

test('пустой перевод — берётся английский текст', () => {
  assert.equal(t('test.untranslated'), en['test.untranslated'])
})

test('formatBytes', () => {
  assert.equal(formatBytes(0), '0 Б')
  assert.equal(formatBytes(1536 * 1024 * 1024), '1,5 ГБ')
  assert.equal(formatBytes(340 * 1024 * 1024), '340 МБ')
})

test('formatDate', () => assert.equal(formatDate('2026-11-05T12:00:00Z'), '5 ноября 2026'))

test('formatDateTime: дата и время по-русски', () => {
  const d = new Date(2026, 10, 5, 14, 30)
  assert.equal(formatDateTime(d), '5 ноября 2026, 14:30')
})

test('formatNumber', () => assert.equal(formatNumber(1234567), '1 234 567'.replace(/ /g, ' ')))

test('countryName: страна по коду ISO — по-русски', () => {
  assert.equal(countryName('DE', 'Germany'), 'Германия')
  assert.equal(countryName('ru', 'Russia'), 'Россия')
})

test('countryName: неизвестный код — запасное название', () => {
  assert.equal(countryName('not-a-code', 'Atlantis'), 'Atlantis')
})

test('languageName: язык по коду — по-русски, с большой буквы', () => {
  assert.equal(languageName('eng', 'English'), 'Английский')
  assert.equal(languageName('ru', 'Russian'), 'Русский')
  assert.equal(languageName('zzz-bad', 'Klingon'), 'Klingon')
})

test('formatDecimal: фиксированное число знаков после запятой', () => {
  assert.equal(formatDecimal(85.34), '85,3')
  assert.equal(formatDecimal(1234.5, 1), '1 234,5')
  assert.equal(formatDecimal(12, 1), '12,0')
  assert.equal(formatDecimal(0.456, 0), '0')
})

test('LOCALE — русский', () => assert.equal(LOCALE, 'ru'))

test('в русском словаре нет пустых переводов, кроме тестового ключа', () => {
  const empty = Object.entries(ru).filter(([k, v]) => v === '' && k !== 'test.untranslated')
  assert.deepEqual(empty, [])
})

// На Windows node + ts-node падает (Segmentation fault) при загрузке одного .ts-файла крупнее ~30 КБ.
// Поэтому словарь разбит на небольшие файлы по областям — этот тест не даёт им разрастись.
test('файлы словаря небольшие (не больше 24 КБ)', () => {
  const big: string[] = []
  for (const lang of ['en', 'ru']) {
    const dir = join(import.meta.dirname, '..', '..', 'constants', 'i18n', lang)
    for (const name of readdirSync(dir)) {
      const size = statSync(join(dir, name)).size
      if (size > 24 * 1024) big.push(`${lang}/${name}: ${size}`)
    }
  }
  assert.deepEqual(big, [])
})

// Знак «|» в переводе — разделитель форм множественного числа: в ru их 3, в en 2.
// Иначе строка с count обрежется (так случилось с «Материалов: … | Размер: …»).
test('строки с «|» — правильное число форм множественного числа', () => {
  const bad: string[] = []
  for (const [key, value] of Object.entries(ru)) {
    if (value.includes('|') && value.split('|').length !== 3) bad.push(`ru ${key}`)
  }
  for (const [key, value] of Object.entries(en)) {
    if (value.includes('|') && value.split('|').length !== 2) bad.push(`en ${key}`)
  }
  assert.deepEqual(bad, [])
})
