import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { categoryLabel } from '../../inertia/lib/app_category.js'

test('категории приложений Склада — по-русски, как в фильтрах', () => {
  assert.equal(categoryLabel('education'), 'Обучение')
  assert.equal(categoryLabel('productivity'), 'Работа')
  assert.equal(categoryLabel('utility'), 'Утилиты')
  assert.equal(categoryLabel('media'), 'Медиа')
  assert.equal(categoryLabel('security'), 'Безопасность')
  assert.equal(categoryLabel('networking'), 'Сеть')
  assert.equal(categoryLabel('ai'), 'ИИ')
  assert.equal(categoryLabel('Education'), 'Обучение')
})

test('незнакомая категория показывается как есть, с большой буквы', () => {
  assert.equal(categoryLabel('gaming'), 'Gaming')
})
