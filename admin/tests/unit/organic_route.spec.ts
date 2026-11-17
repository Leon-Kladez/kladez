import { test } from 'node:test'
import assert from 'node:assert/strict'

import { goPath, organicMapsRouteUrl, parseGoQuery, type GoTrip } from '../../inertia/lib/organic_route.js'

const trip: GoTrip = {
  from: { lat: 47.24204, lon: 39.81129, label: 'Ростов-на-Дону' },
  to: { lat: 53.906421, lon: 27.583451, label: 'Минск, проспект Независимости 1' },
  mode: 'auto',
}

test('ссылка для Organic Maps: om://route, все пять частей по порядку', () => {
  const url = organicMapsRouteUrl(trip)
  assert.ok(url.startsWith('om://route?'))
  const keys = [...new URLSearchParams(url.slice('om://route?'.length)).keys()]
  assert.deepEqual(keys, ['sll', 'saddr', 'dll', 'daddr', 'type'], 'Organic Maps проверяет порядок')
  const q = new URLSearchParams(url.slice('om://route?'.length))
  assert.equal(q.get('sll'), '47.24204,39.81129')
  assert.equal(q.get('dll'), '53.906421,27.583451')
  assert.equal(q.get('daddr'), 'Минск, проспект Независимости 1')
  assert.equal(q.get('type'), 'vehicle')
  assert.ok(organicMapsRouteUrl({ ...trip, mode: 'pedestrian' }).endsWith('&type=pedestrian'))
  assert.ok(organicMapsRouteUrl({ ...trip, mode: 'bicycle' }).endsWith('&type=bicycle'))
})

test('пустое название точки не ломает ссылку', () => {
  const q = new URLSearchParams(organicMapsRouteUrl({ ...trip, from: { ...trip.from, label: '  ' } }).split('?')[1])
  assert.equal(q.get('saddr'), '•')
})

test('страница «Открыть в навигаторе»: туда и обратно без потерь', () => {
  const path = goPath(trip)
  assert.ok(path.startsWith('/go?'))
  assert.deepEqual(parseGoQuery(path.slice(3)), trip)
})

test('битый адрес страницы — не маршрут', () => {
  assert.equal(parseGoQuery('?f=1,2&t=3,4'), null, 'без способа')
  assert.equal(parseGoQuery('?f=1,2&t=95,4&m=auto'), null, 'широта больше 90')
  assert.equal(parseGoQuery('?f=abc&t=3,4&m=auto'), null)
  assert.equal(parseGoQuery('?f=1,2&t=3,4&m=plane'), null)
})
