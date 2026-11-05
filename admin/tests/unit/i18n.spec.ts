import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { en, ru, t, tIn, formatBytes, formatDate, formatDateTime, formatNumber, countryName, LOCALE } from '../../constants/i18n/index.js'

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

test('LOCALE — русский', () => assert.equal(LOCALE, 'ru'))

test('в русском словаре нет пустых переводов, кроме тестового ключа', () => {
  const empty = Object.entries(ru).filter(([k, v]) => v === '' && k !== 'test.untranslated')
  assert.deepEqual(empty, [])
})
