import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  DEFAULT_LOCALE,
  LOCALE_NAMES,
  SUPPORTED_LOCALES,
  formatBytes,
  formatDate,
  formatNumber,
  getLocale,
  monthName,
  resolveLocale,
  setLocale,
  t,
} from '../../constants/i18n/index.js'
import { localizeModels } from '../../app/utils/ai_models.js'
import { validateSettingValue } from '../../app/validators/settings.js'
import type { NomadOllamaModel } from '../../types/ollama.js'

/** Выполнить fn на языке locale и вернуть язык по умолчанию. */
function withLocale<T>(locale: string, fn: () => T): T {
  setLocale(locale)
  try {
    return fn()
  } finally {
    setLocale(DEFAULT_LOCALE)
  }
}

test('resolveLocale: ru и en — как есть', () => {
  assert.equal(resolveLocale('ru'), 'ru')
  assert.equal(resolveLocale('en'), 'en')
  assert.equal(resolveLocale('EN'), 'en')
  assert.equal(resolveLocale('en-US'), 'en')
  assert.equal(resolveLocale(' ru_RU '), 'ru')
})

test('resolveLocale: неизвестное или пустое → русский', () => {
  for (const v of ['de', 'fr-FR', '', '   ', null, undefined, 42, {}, 'english']) {
    assert.equal(resolveLocale(v), 'ru', String(v))
  }
})

test('по умолчанию язык — русский', () => {
  assert.equal(DEFAULT_LOCALE, 'ru')
  assert.equal(getLocale(), 'ru')
})

test('setLocale: незнакомый язык откатывается на русский', () => {
  assert.equal(setLocale('en'), 'en')
  assert.equal(setLocale('xx'), 'ru')
  assert.equal(getLocale(), 'ru')
})

test('t() говорит на текущем языке', () => {
  assert.equal(t('test.files', { count: 5 }), '5 файлов')
  withLocale('en', () => assert.equal(t('test.files', { count: 5 }), '5 files'))
  assert.equal(t('test.files', { count: 21 }), '21 файл')
})

test('размеры, числа и даты — по языку', () => {
  assert.equal(formatBytes(1536 * 1024 * 1024), '1,5 ГБ')
  assert.equal(formatDate('2026-11-05T12:00:00Z'), '5 ноября 2026')
  withLocale('en', () => {
    assert.equal(formatBytes(1536 * 1024 * 1024), '1.5 GB')
    assert.equal(formatBytes(0), '0 B')
    assert.equal(formatNumber(1234567), '1,234,567')
    assert.equal(formatDate('2026-11-05T12:00:00Z'), 'November 5, 2026')
    assert.equal(monthName(new Date(Date.UTC(2026, 9, 1))), 'October')
  })
  assert.equal(monthName(new Date(Date.UTC(2026, 9, 1))), 'октября')
})

test('у каждого языка есть название на нём самом', () => {
  assert.deepEqual([...SUPPORTED_LOCALES].sort(), ['en', 'ru'])
  assert.equal(LOCALE_NAMES.ru, 'Русский')
  assert.equal(LOCALE_NAMES.en, 'English')
})

test('настройка ui.language принимает только известные языки', () => {
  assert.equal(validateSettingValue('ui.language', 'ru'), null)
  assert.equal(validateSettingValue('ui.language', 'en'), null)
  assert.equal(validateSettingValue('ui.language', ''), null)
  assert.notEqual(validateSettingValue('ui.language', 'de'), null)
  assert.notEqual(validateSettingValue('ui.language', 7), null)
})

test('описания ИИ-моделей: по-английски — description_en, если он есть', () => {
  const models = [
    { name: 'a', description: 'Русское описание', description_en: 'English description' },
    { name: 'b', description: 'Only English' },
  ] as unknown as NomadOllamaModel[]
  assert.equal(localizeModels(models, 'ru'), models)
  const en = localizeModels(models, 'en')
  assert.equal(en[0].description, 'English description')
  assert.equal(en[1].description, 'Only English')
  assert.equal(models[0].description, 'Русское описание', 'исходный список не меняется')
})
