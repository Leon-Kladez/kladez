import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { zoomForBounds } from '../../inertia/lib/map_search_ui.js'

test('масштаб «вся страна»: Беларусь ~6, Россия меньше, Мальта крупнее, в пределах 2–12', () => {
  const by = zoomForBounds([23.2, 51.2, 32.8, 56.2])
  assert.ok(by > 5 && by < 7, `Беларусь: ${by}`)
  const ru = zoomForBounds([19.6, 41.2, 180, 81.9])
  assert.ok(ru < by && ru >= 2, `Россия: ${ru}`)
  const mt = zoomForBounds([14.18, 35.8, 14.58, 36.08])
  assert.ok(mt > by && mt <= 12, `Мальта: ${mt}`)
})
