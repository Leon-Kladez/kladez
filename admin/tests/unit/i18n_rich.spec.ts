import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { createElement } from 'react'

import { tx } from '../../inertia/lib/tx.js'

test('tx: подставляет элементы разметки в русскую фразу', () => {
  const bold = createElement('strong', null, '5 ГБ')
  const parts = tx('test.hello', { name: bold })
  assert.equal(parts.length, 2)
  assert.equal(parts[0], 'Здравствуйте, ')
  assert.equal((parts[1] as any).props.children, '5 ГБ')
})

test('tx: строки и числа подставляются как текст', () => {
  assert.deepEqual(tx('test.hello', { name: 'Анна' }), ['Здравствуйте, Анна'])
})

test('tx: русские формы множественного числа', () => {
  assert.deepEqual(tx('test.files', { count: 5 }), ['5 файлов'])
})
