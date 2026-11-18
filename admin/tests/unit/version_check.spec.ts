import { test } from 'node:test'
import assert from 'node:assert/strict'

import { isNewerServerVersion } from '../../inertia/lib/version_check.js'

test('плашка «Кладезъ обновился» — только когда версия на сервере другая и настоящая', () => {
  assert.equal(isNewerServerVersion('0.1.32', '0.1.33'), true)
  assert.equal(isNewerServerVersion('0.1.33', '0.1.33'), false)
  assert.equal(isNewerServerVersion('0.1.33', undefined), false, 'старый Кладезъ без версии в ответе')
  assert.equal(isNewerServerVersion('dev', '0.1.33'), false)
  assert.equal(isNewerServerVersion('0.1.33', 'dev'), false)
})
