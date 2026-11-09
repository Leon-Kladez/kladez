import { test } from 'node:test'
import assert from 'node:assert/strict'

import { applyKladezStyle, HOUSE_NUMBER_MINZOOM, PLACES_LAYER_ID } from '../../app/utils/map_style.js'
import { PLACE_GROUPS, PLACE_ICON_PREFIX, formatHouseNumber, placeGroupForKind, placeKindName } from '../../constants/map_places.js'
import { describePlace, shortPlaceLabel, templateLayerId } from '../../inertia/lib/map_place_info.js'
import type { MapLayer } from '../../types/maps.js'

const template: MapLayer[] = [
  { id: 'background', type: 'background' },
  { 'id': 'buildings', 'type': 'fill', 'source': 'protomaps', 'source-layer': 'buildings' },
  {
    'id': 'address_label',
    'type': 'symbol',
    'source': 'protomaps',
    'source-layer': 'buildings',
    'minzoom': 18,
    'filter': ['==', 'kind', 'address'],
    'layout': { 'text-field': ['get', 'addr_housenumber'] },
  },
  {
    'id': 'roads_labels_minor',
    'type': 'symbol',
    'source': 'protomaps',
    'source-layer': 'roads',
    'layout': { 'text-field': ['coalesce', ['get', 'name:ru'], ['get', 'name']] },
  },
  { 'id': 'pois', 'type': 'symbol', 'source': 'protomaps', 'source-layer': 'pois', 'layout': { 'text-field': ['get', 'name'] } },
  { 'id': 'places_locality', 'type': 'symbol', 'source': 'protomaps', 'source-layer': 'places', 'layout': {} },
]

test('номера домов: все дома с номером и с 16-го масштаба', () => {
  const out = applyKladezStyle(template)
  const house = out.find((l) => l.id === 'address_label')!
  assert.equal(house.minzoom, HOUSE_NUMBER_MINZOOM)
  assert.deepEqual(house.filter, ['has', 'addr_housenumber'])
  assert.equal(house.source, 'protomaps')
  assert.equal(house['source-layer'], 'buildings')
})

test('важные места — свой слой сразу после обычных мест, значки kz-*', () => {
  const out = applyKladezStyle(template)
  const ids = out.map((l) => l.id)
  assert.equal(ids.indexOf(PLACES_LAYER_ID), ids.indexOf('pois') + 1)
  const places = out.find((l) => l.id === PLACES_LAYER_ID)!
  const json = JSON.stringify(places)
  for (const g of PLACE_GROUPS) assert.ok(json.includes(`"${PLACE_ICON_PREFIX}${g.id}"`), g.id)
  assert.ok(json.includes('"pharmacy"') && json.includes('"hospital"') && json.includes('"subway_entrance"'))
})

test('повторное применение не задваивает слой мест; вход не меняется', () => {
  const before = JSON.stringify(template)
  const once = applyKladezStyle(template)
  const twice = applyKladezStyle(once)
  assert.equal(twice.filter((l) => l.id === PLACES_LAYER_ID).length, 1)
  assert.equal(JSON.stringify(template), before)
})

test('шаблон без номеров и без pois — слои всё равно добавляются', () => {
  const out = applyKladezStyle([{ id: 'background', type: 'background' }, { id: 'x', type: 'symbol', source: 'protomaps' }])
  assert.ok(out.some((l) => l.id === 'address_label'))
  assert.ok(out.some((l) => l.id === PLACES_LAYER_ID))
})

test('английский язык панели — подписи с названиями берут name:en, номера домов не трогаются', () => {
  const out = applyKladezStyle(template, 'en')
  const road = out.find((l) => l.id === 'roads_labels_minor')!
  assert.deepEqual(road.layout['text-field'], ['coalesce', ['get', 'name:en'], ['get', 'name']])
  const house = out.find((l) => l.id === 'address_label')!
  assert.deepEqual(house.layout['text-field'], ['get', 'addr_housenumber'])
  const ru = applyKladezStyle(template, 'ru').find((l) => l.id === 'roads_labels_minor')!
  assert.deepEqual(ru.layout['text-field'], ['coalesce', ['get', 'name:ru'], ['get', 'name']])
})

test('у каждой группы мест есть название вида на обоих языках', () => {
  for (const g of PLACE_GROUPS) {
    for (const k of g.kinds) {
      assert.ok(placeKindName(k, 'ru'), `ru ${k}`)
      assert.ok(placeKindName(k, 'en'), `en ${k}`)
      assert.equal(placeGroupForKind(k)?.id, g.id)
    }
  }
  assert.equal(placeKindName('pharmacy', 'ru'), 'Аптека')
  assert.equal(placeKindName('nonsense', 'ru'), null)
})

test('номер дома читается по-человечески', () => {
  assert.equal(formatHouseNumber('7/10 ст1'), '7/10 стр. 1')
  assert.equal(formatHouseNumber('3с2'), '3 стр. 2')
  assert.equal(formatHouseNumber('5к2'), '5 корп. 2')
  assert.equal(formatHouseNumber('вл3'), 'вл. 3')
  assert.equal(formatHouseNumber('12'), '12')
  assert.equal(formatHouseNumber(''), null)
  assert.equal(formatHouseNumber(undefined), null)
})

test('слой региона → слой шаблона', () => {
  assert.equal(templateLayerId('kz_places-ru-central'), 'kz_places')
  assert.equal(templateLayerId('address_label-world'), 'address_label')
  assert.equal(templateLayerId('background'), 'background')
})

test('подсказка: аптека с названием, номером дома и улицей', () => {
  const info = describePlace(
    [
      { layer: 'kz_places', properties: { 'kind': 'pharmacy', 'name': 'Ригла', 'name:ru': 'Ригла' } },
      { layer: 'buildings', properties: { kind: 'building', addr_housenumber: '7/10 ст1' } },
    ],
    [{ layer: 'roads_minor', properties: { 'name': 'Пятницкая улица', 'name:en': 'Pyatnitskaya Street' } }],
    'ru',
    'Дом'
  )!
  assert.deepEqual(info, { title: 'Ригла', kind: 'Аптека', house: '7/10 стр. 1', street: 'Пятницкая улица' })
  assert.equal(shortPlaceLabel(info), 'Аптека «Ригла»')
})

test('подсказка при наведении: вид не повторяется, если он уже в названии', () => {
  const info = describePlace(
    [{ layer: 'kz_places', properties: { kind: 'place_of_worship', name: 'Храм Усекновения главы Иоанна Предтечи' } }],
    [],
    'ru',
    'Дом'
  )!
  assert.equal(shortPlaceLabel(info), 'Храм Усекновения главы Иоанна Предтечи')
})

test('подсказка: место без названия — вид места', () => {
  const info = describePlace([{ layer: 'pois', properties: { kind: 'atm' } }], [], 'ru', 'Дом')!
  assert.equal(info.title, 'Банкомат')
  assert.equal(info.kind, null)
  assert.equal(shortPlaceLabel(info), 'Банкомат')
})

test('подсказка: просто дом — «Дом 5»; английский — House и английская улица', () => {
  const ru = describePlace([{ layer: 'address_label', properties: { addr_housenumber: '5' } }], [], 'ru', 'Дом')!
  assert.equal(ru.title, 'Дом 5')
  const en = describePlace(
    [{ layer: 'buildings', properties: { addr_housenumber: '5' } }],
    [{ layer: 'roads_minor', properties: { 'name': 'Пятницкая улица', 'name:en': 'Pyatnitskaya Street' } }],
    'en',
    'House'
  )!
  assert.equal(en.title, 'House 5')
  assert.equal(en.street, 'Pyatnitskaya Street')
})

test('подсказка: пусто или дом без номера — показывать нечего (дальше — новая метка)', () => {
  assert.equal(describePlace([], [], 'ru', 'Дом'), null)
  assert.equal(describePlace([{ layer: 'buildings', properties: { kind: 'building' } }], [], 'ru', 'Дом'), null)
})
