import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { projectRussia, geometryToPath, SCHEMA_WIDTH, SCHEMA_HEIGHT } from '../../inertia/lib/district_schema.js'

test('projectRussia: Калининград слева, Чукотка справа, всё внутри рисунка', () => {
  const [kx, ky] = projectRussia([20.5, 54.7])
  const [cx] = projectRussia([-174, 66]) // восточнее 180° — не прыгает влево
  assert.ok(kx >= 0 && kx < SCHEMA_WIDTH * 0.1, `Калининград x=${kx}`)
  assert.ok(cx > SCHEMA_WIDTH * 0.9 && cx <= SCHEMA_WIDTH, `Чукотка x=${cx}`)
  assert.ok(ky > 0 && ky < SCHEMA_HEIGHT)
})

test('geometryToPath: многоугольник → замкнутый путь SVG', () => {
  const d = geometryToPath({ type: 'Polygon', coordinates: [[[30, 60], [40, 60], [40, 55], [30, 60]]] })
  assert.match(d, /^M[\d.]+,[\d.]+(L[\d.]+,[\d.]+){2}Z$/)
  const multi = geometryToPath({ type: 'MultiPolygon', coordinates: [[[[30, 60], [40, 60], [40, 55], [30, 60]]], [[[50, 60], [60, 60], [60, 55], [50, 60]]]] })
  assert.equal((multi.match(/M/g) ?? []).length, 2)
})
