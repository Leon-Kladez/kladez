import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { relativeTimeRu } from '../../inertia/lib/relative_time.js'

test('английское «… ago» из каталога Ollama — по-русски с правильными формами', () => {
  assert.equal(relativeTimeRu('1 year ago'), '1 год назад')
  assert.equal(relativeTimeRu('2 years ago'), '2 года назад')
  assert.equal(relativeTimeRu('7 months ago'), '7 месяцев назад')
  assert.equal(relativeTimeRu('21 days ago'), '21 день назад')
  assert.equal(relativeTimeRu('3 weeks ago'), '3 недели назад')
  assert.equal(relativeTimeRu('5 hours ago'), '5 часов назад')
  assert.equal(relativeTimeRu('a year ago'), '1 год назад')
  assert.equal(relativeTimeRu('an hour ago'), '1 час назад')
  assert.equal(relativeTimeRu('yesterday'), 'вчера')
})

test('незнакомый текст остаётся как есть', () => {
  assert.equal(relativeTimeRu('2024-05-01'), '2024-05-01')
  assert.equal(relativeTimeRu(''), '')
})
