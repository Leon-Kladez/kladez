import { test } from 'node:test'
import assert from 'node:assert/strict'

import { activityTime, friendlyMessage, friendlyServiceName } from '../../inertia/lib/install_activity.js'

test('«Ход установки»: названия программ по-человечески', () => {
  assert.equal(friendlyServiceName('nomad_ollama'), 'ИИ-помощник')
  assert.equal(friendlyServiceName('nomad_kiwix_server'), 'Библиотека')
  assert.equal(friendlyServiceName('nomad_whisper'), 'Распознавание речи')
  assert.equal(friendlyServiceName('my_custom_app'), 'my custom app', 'своё приложение — без подчёркиваний')
})

test('технические имена внутри сообщения тоже заменяются', () => {
  assert.equal(friendlyMessage('nomad_ollama обновлён до 0.40.16', 'nomad_ollama'), '«ИИ-помощник» обновлён до 0.40.16')
  assert.equal(friendlyMessage('', 'nomad_ollama'), '')
})

test('время — часы:минуты:секунды, а не 2026-11-18T08:13:44Z', () => {
  const ts = new Date(2026, 10, 18, 11, 3, 7).toISOString()
  assert.equal(activityTime(ts), '11:03:07')
  assert.equal(activityTime('не дата'), 'не дата')
})
