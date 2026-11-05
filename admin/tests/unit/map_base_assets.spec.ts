import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { pickBaseAssetsSource } from '../../app/utils/map_packages.js'

test('без адреса берётся встроенный архив', () => {
  const s = pickBaseAssetsSource(undefined, true, '/app/resources/maps/base-assets.tar.gz')
  assert.deepEqual(s, { kind: 'file', path: '/app/resources/maps/base-assets.tar.gz' })
})

test('явный адрес — скачивание по нему', () => {
  assert.deepEqual(pickBaseAssetsSource('https://x/y.tar.gz', true, '/a'), { kind: 'url', url: 'https://x/y.tar.gz' })
})

test('нет ни адреса, ни встроенного архива — понятная ошибка', () => {
  assert.throws(() => pickBaseAssetsSource(undefined, false, '/a'), /Базовые материалы карт не найдены/)
})
