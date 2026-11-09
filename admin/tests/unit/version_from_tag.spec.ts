import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { isNewerVersion, versionFromTag } from '../../app/utils/version.js'

test('версия из тега выпуска установщика', () => {
  assert.equal(versionFromTag('installer-v0.1.15'), '0.1.15')
  assert.equal(versionFromTag('v0.1.15'), '0.1.15')
  assert.equal(versionFromTag(' 0.1.15 '), '0.1.15')
  assert.equal(isNewerVersion(versionFromTag('installer-v0.1.16'), '0.1.15'), true)
  assert.equal(isNewerVersion(versionFromTag('installer-v0.1.15'), '0.1.15'), false)
})
