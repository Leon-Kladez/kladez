import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { humanizeError, humanizeOptional, insufficientDiskMessage } from '../../app/utils/user_errors.js'

// Самые тревожные сообщения сервера человек должен видеть по-русски и понимать, что делать.

test('не удалось скачать файл: ответ сервера с ошибкой', () => {
  const text = humanizeError('Failed to download: HTTP 404')
  assert.match(text, /Не удалось скачать/)
  assert.match(text, /404/)
})

test('нет интернета: сетевые ошибки превращаются в понятный текст', () => {
  for (const raw of [
    'getaddrinfo ENOTFOUND download.kiwix.org',
    'getaddrinfo EAI_AGAIN api.github.com',
    'connect ENETUNREACH 1.1.1.1:443',
    'connect ECONNREFUSED 10.0.0.1:443',
    'timeout of 30000ms exceeded',
  ]) {
    const text = humanizeError(raw)
    assert.match(text, /интернет/i, raw)
    assert.doesNotMatch(text, /[A-Z]{5,}/, `в тексте остался код ошибки: ${text}`)
  }
})

test('не хватает места на диске', () => {
  assert.match(humanizeError('ENOSPC: no space left on device, write'), /Не хватает места на диске/)
  const msg = insufficientDiskMessage(1.5 * 1024 ** 3, 4 * 1024 ** 3)
  assert.match(msg, /Не хватает места на диске/)
  assert.match(msg, /1,5 ГБ/)
  assert.match(msg, /4 ГБ/)
})

test('незнакомая ошибка остаётся как есть, пустая — общий текст', () => {
  assert.equal(humanizeError('Что-то своё'), 'Что-то своё')
  assert.match(humanizeError(undefined), /Неизвестная ошибка/)
})

test('загрузка зависла или отменена', () => {
  assert.match(humanizeError('Download stalled - no data received for 5 minutes'), /не приходят/)
  assert.match(humanizeError('Download aborted'), /отменено/)
})

test('humanizeOptional: пустая причина остаётся пустой', () => {
  assert.equal(humanizeOptional(undefined), undefined)
  assert.match(humanizeOptional('getaddrinfo ENOTFOUND x') ?? '', /интернет/)
})

test('ошибка проверки настройки приходит по-русски', async () => {
  const { validateSettingValue } = await import('../../app/validators/settings.js')
  assert.match(validateSettingValue('autoUpdate.windowStart', '25:99') ?? '', /ЧЧ:ММ/)
  assert.match(validateSettingValue('ai.amdHsaOverride', 'abc') ?? '', /[А-Яа-я]/)
})
