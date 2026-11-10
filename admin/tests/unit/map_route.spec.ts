import { test } from 'node:test'
import assert from 'node:assert/strict'

import {
  decodePolyline6,
  lineBounds,
  parseValhallaRoute,
  routeErrorKey,
  valhallaRouteRequest,
} from '../../app/utils/map_route.js'

/** Кодировщик polyline6 — для проверки разборщика. */
function encode(points: [number, number][]): string {
  let out = ''
  let plat = 0
  let plon = 0
  const enc = (v: number) => {
    let x = v < 0 ? ~(v << 1) : v << 1
    let s = ''
    while (x >= 0x20) {
      s += String.fromCharCode((0x20 | (x & 0x1f)) + 63)
      x >>= 5
    }
    return s + String.fromCharCode(x + 63)
  }
  for (const [lon, lat] of points) {
    const ilat = Math.round(lat * 1e6)
    const ilon = Math.round(lon * 1e6)
    out += enc(ilat - plat) + enc(ilon - plon)
    plat = ilat
    plon = ilon
  }
  return out
}

const LINE: [number, number][] = [
  [37.617478, 55.750541],
  [37.62, 55.748],
  [37.6265, 55.7445],
  [-0.1, -33.9],
]

test('линия маршрута (polyline6) разбирается в [долгота, широта]', () => {
  const back = decodePolyline6(encode(LINE))
  assert.equal(back.length, LINE.length)
  for (let i = 0; i < LINE.length; i++) {
    assert.ok(Math.abs(back[i][0] - LINE[i][0]) < 1e-6)
    assert.ok(Math.abs(back[i][1] - LINE[i][1]) < 1e-6)
  }
  assert.deepEqual(decodePolyline6(''), [])
  assert.deepEqual(lineBounds(LINE.slice(0, 3)), [37.617478, 55.7445, 37.6265, 55.750541])
})

test('запрос к Valhalla: точки, способ, язык', () => {
  const r = valhallaRouteRequest({ lat: 55.75, lon: 37.61 }, { lat: 54.19, lon: 37.61 }, 'pedestrian', 'ru-RU')
  assert.equal(r.costing, 'pedestrian')
  assert.equal(r.language, 'ru-RU')
  assert.deepEqual(r.locations[1], { lat: 54.19, lon: 37.61, type: 'break' })
})

test('ответ Valhalla → расстояние, время, линия, подсказки', () => {
  const body = {
    trip: {
      summary: { length: 182.46, time: 9300 },
      legs: [
        {
          shape: encode(LINE.slice(0, 3)),
          maneuvers: [
            { instruction: 'Двигайтесь на юг.', length: 0.3, time: 40, begin_shape_index: 0, type: 1 },
            { instruction: 'Поверните направо на Пятницкую улицу.', length: 1.25, time: 125, begin_shape_index: 1, type: 10 },
            { instruction: 'Вы прибыли.', length: 0, time: 0, begin_shape_index: 2, type: 4 },
          ],
        },
      ],
    },
  }
  const r = parseValhallaRoute(body, 'auto')
  assert.equal(r.distanceKm, 182.5)
  assert.equal(r.timeMin, 155)
  assert.equal(r.line.length, 3)
  assert.equal(r.steps.length, 3)
  assert.deepEqual(r.steps[1], { instruction: 'Поверните направо на Пятницкую улицу.', distanceKm: 1.25, timeMin: 2.1, at: 1, type: 10 })
  assert.throws(() => parseValhallaRoute({}, 'auto'), /no_route/)
})

test('ошибки Valhalla → понятная причина', () => {
  assert.equal(routeErrorKey({ error_code: 442 }), 'routes.noRoad')
  assert.equal(routeErrorKey({ error_code: 171 }), 'routes.noData')
  assert.equal(routeErrorKey({ error_code: 170 }), 'routes.gap')
  assert.equal(routeErrorKey({ error_code: 154 }), 'routes.tooFar')
  assert.equal(routeErrorKey({}), 'routes.failed')
})
