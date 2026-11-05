import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { loadRegions } from '../src/regions.mjs'
import { NE_ADMIN0_PATH } from '../src/geodata.mjs'
import { regionGeometry, pointInGeometry } from '../src/geometry.mjs'

const neepath = process.env.NE_ADMIN1_PATH
const regions = loadRegions(fileURLToPath(new URL('../regions.json', import.meta.url)))
const ne0 = JSON.parse(readFileSync(NE_ADMIN0_PATH, 'utf8'))
const ne1 = neepath ? JSON.parse(readFileSync(neepath, 'utf8')) : null
const geom = (id) => regionGeometry(regions.find((r) => r.id === id), ne0, ne1)

test('pointInGeometry: квадрат и дырка', () => {
  const fc = {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [
      [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
      [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
    ] } }],
  }
  assert.equal(pointInGeometry([1, 1], fc), true)
  assert.equal(pointInGeometry([5, 5], fc), false)
  assert.equal(pointInGeometry([11, 1], fc), false)
})

test('Израиль и Палестина: Иерусалим и Газа внутри', () => {
  const g = geom('israel-palestine')
  assert.ok(pointInGeometry([35.21, 31.77], g))
  assert.ok(pointInGeometry([34.45, 31.5], g))
})

test('округа России и спорные территории', (t) => {
  if (!ne1) return t.skip('NE_ADMIN1_PATH не задан')
  assert.ok(pointInGeometry([37.62, 55.75], geom('ru-central')), 'Москва в ЦФО')
  assert.ok(!pointInGeometry([37.62, 55.75], geom('ru-volga')), 'Москва не в ПФО')
  assert.ok(pointInGeometry([34.1, 44.95], geom('ru-south')), 'Симферополь в ЮФО')
  assert.ok(pointInGeometry([34.1, 44.95], geom('ua')), 'Симферополь в Украине')
  assert.ok(pointInGeometry([39.68, 43.55], geom('ru-south')), 'Сочи у берега — запас работает')
  // Анадырь в грубом контуре NE стоит «в воде» лимана, поэтому точки на суше по обе стороны 180°.
  assert.ok(pointInGeometry([166.44, 68.05], geom('ru-far-east')), 'Чукотка, Билибино')
  assert.ok(pointInGeometry([-174, 66], geom('ru-far-east')), 'Чукотка восточнее 180°')
})
