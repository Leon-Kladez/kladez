import { test } from 'node:test'
import assert from 'node:assert/strict'

import { NEARBY_GROUPS, pickNearest } from '../../constants/nearby.js'

test('«Рядом»: ближние первыми, одно и то же место — один раз, не больше трёх', () => {
  const near = pickNearest([
    { name: 'Ригла', kind: 'pharmacy', lat: 0, lon: 0, distanceKm: 0.3, address: null },
    { name: 'Столички', kind: 'pharmacy', lat: 0, lon: 0, distanceKm: 0.2, address: null },
    { name: 'Столички', kind: 'pharmacy', lat: 0, lon: 0, distanceKm: 0.25, address: 'Пятницкая, 7' },
    { name: 'Горздрав', kind: 'pharmacy', lat: 0, lon: 0, distanceKm: 1.1, address: null },
    { name: 'Вита', kind: 'pharmacy', lat: 0, lon: 0, distanceKm: 2.2, address: null },
  ])
  assert.deepEqual(near.map((p) => `${p.name} ${p.distanceM}`), ['Столички 200', 'Ригла 300', 'Горздрав 1100'])
})

test('аптека — только настоящие аптеки: «chemist» в России — бытовая химия', () => {
  const pharmacy = NEARBY_GROUPS.find((g) => g.id === 'pharmacy')!
  assert.deepEqual(pharmacy.kinds, ['pharmacy'])
  assert.ok(NEARBY_GROUPS.some((g) => g.id === 'water' && g.kinds.includes('drinking_water')))
})
