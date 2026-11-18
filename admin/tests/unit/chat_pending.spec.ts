import { test } from 'node:test'
import assert from 'node:assert/strict'
import { appendPending, finishPending, getPending, startPending, stopPending } from '../../app/utils/chat_pending.js'

test('ответ, который ещё пишется, копится по разговору и исчезает по окончании', () => {
  assert.equal(getPending(7), null)
  const e = startPending(7)
  appendPending(e, '', 'Хорошо, пользователь')
  appendPending(e, 'Привет', ' спрашивает')
  const p = getPending(7)
  assert.equal(p?.content, 'Привет')
  assert.equal(p?.thinking, 'Хорошо, пользователь спрашивает')
  assert.equal(getPending(8), null)
  finishPending(7, e)
  assert.equal(getPending(7), null)
})

test('остановленный запрос, уходя, не стирает следующий — и «Стоп» его находит', () => {
  let stopped1 = 0
  let stopped2 = 0
  const first = startPending(9, () => stopped1++)
  assert.equal(stopPending(9), true)
  const second = startPending(9, () => stopped2++)
  appendPending(second, 'Поскольку', '')
  finishPending(9, first) // первый оборвался только сейчас
  assert.equal(getPending(9)?.content, 'Поскольку')
  assert.equal(stopPending(9), true)
  assert.equal(stopped2, 1)
  finishPending(9, second)
  assert.equal(getPending(9), null)
  assert.equal(stopPending(9), false)
})
