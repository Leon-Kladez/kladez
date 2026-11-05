import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { shouldResumeFailedDownload } from '../../app/utils/resume_decision.js'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 10, 5)
const base = { unrecoverable: false, superseded: false, tmpBytes: 5e9, finishedOn: now - DAY, now }

test('a network failure is resumed once the internet is back', () => {
  assert.equal(shouldResumeFailedDownload({ ...base, failedReason: 'connect ETIMEDOUT 1.2.3.4:443' }), true)
  assert.equal(shouldResumeFailedDownload({ ...base, failedReason: 'socket hang up' }), true)
})

test('it is resumed even without a partial file (starts from zero)', () => {
  assert.equal(
    shouldResumeFailedDownload({ ...base, tmpBytes: null, failedReason: 'getaddrinfo ENOTFOUND' }),
    true
  )
})

test('user cancels and permanent errors are left alone', () => {
  assert.equal(
    shouldResumeFailedDownload({ ...base, unrecoverable: true, failedReason: 'Download cancelled: aborted' }),
    false
  )
  assert.equal(
    shouldResumeFailedDownload({ ...base, failedReason: 'MIME type text/html is not allowed' }),
    false
  )
  assert.equal(
    shouldResumeFailedDownload({ ...base, failedReason: 'all mirrors returned 404: x.zim' }),
    false
  )
})

test('failures older than 30 days are not revived', () => {
  assert.equal(
    shouldResumeFailedDownload({ ...base, finishedOn: now - 31 * DAY, failedReason: 'ECONNRESET' }),
    false
  )
})

test('a download the person has moved on from is not revived', () => {
  // e.g. Wikipedia all-maxi failed offline, then the person picked another option,
  // or another job is already writing the same file
  assert.equal(
    shouldResumeFailedDownload({ ...base, superseded: true, failedReason: 'connect ETIMEDOUT' }),
    false
  )
})
