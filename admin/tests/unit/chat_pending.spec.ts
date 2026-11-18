import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendPending, finishPending, getPending, startPending } from '../../app/utils/chat_pending.js'

test('ответ, который ещё пишется, копится по разговору и исчезает по окончании', () => {
  assert.equal(getPending(7), null)
  startPending(7)
  appendPending(7, '', 'Хорошо, пользователь')
  appendPending(7, 'Привет', ' спрашивает')
  appendPending(8, 'чужое', '')
  const p = getPending(7)
  assert.equal(p?.content, 'Привет')
  assert.equal(p?.thinking, 'Хорошо, пользователь спрашивает')
  assert.equal(getPending(8), null)
  finishPending(7)
  assert.equal(getPending(7), null)
})
