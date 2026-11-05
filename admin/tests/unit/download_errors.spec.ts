import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { isGatedAuthFailure } from '../../app/utils/download_errors.js'

test('401/403 is a gated-content failure only when we sent credentials', () => {
  assert.equal(isGatedAuthFailure(403, { Authorization: 'Bearer x' }), true)
  assert.equal(isGatedAuthFailure(401, { Authorization: 'Bearer x' }), true)
})

test('a mirror answering 403 to a plain request is an ordinary, retryable error', () => {
  assert.equal(isGatedAuthFailure(403, undefined), false)
  assert.equal(isGatedAuthFailure(403, {}), false)
  assert.equal(isGatedAuthFailure(500, { Authorization: 'Bearer x' }), false)
})
