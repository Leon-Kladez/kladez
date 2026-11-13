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

test('полное название карты: округам России — «Россия: …», у остальных страна уже в названии', async () => {
  const { fullMapTitle } = await import('../../app/utils/map_packages.js')
  assert.equal(fullMapTitle({ title: 'Центральный федеральный округ', country: 'RU' }), 'Россия: Центральный федеральный округ')
  assert.equal(fullMapTitle({ title: 'Приволжский федеральный округ: запад (обзорно)', country: 'RU' }), 'Россия: Приволжский федеральный округ: запад (обзорно)')
  assert.equal(fullMapTitle({ title: 'Беларусь', country: 'BY' }), 'Беларусь')
  assert.equal(fullMapTitle({ title: 'США: Айова', country: 'US' }), 'США: Айова')
  assert.equal(fullMapTitle({ title: 'Своя карта' }), 'Своя карта')
})
