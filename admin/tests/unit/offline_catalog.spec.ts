import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { OfflineGate, OfflineError, isOfflineError } from '../../app/utils/offline_gate.js'
import { BackgroundRefresher, specWithFallback } from '../../app/utils/spec_fallback.js'
import { parseModelSizeGb, parsePulls } from '../../app/utils/ai_models.js'

const never = () => new Promise<never>(() => {})

test('сторож сети: после неудачи сеть не трогаем до конца паузы', async () => {
  let now = 1_000_000
  const gate = new OfflineGate('test', 12 * 60_000, () => now)
  let calls = 0
  const failing = async () => {
    calls++
    throw new Error('EAI_AGAIN')
  }
  await assert.rejects(gate.run(failing), /EAI_AGAIN/)
  assert.equal(gate.isDown(), true)

  // Повторные попытки в паузе — мгновенный OfflineError, fn не вызывается.
  const err = await gate.run(failing).catch((e) => e)
  assert.ok(err instanceof OfflineError)
  assert.ok(isOfflineError(err))
  assert.equal(calls, 1)

  now += 11 * 60_000
  await assert.rejects(gate.run(failing), OfflineError)
  assert.equal(calls, 1)

  // Пауза прошла — пробуем снова; удача открывает сторож.
  now += 2 * 60_000
  assert.equal(await gate.run(async () => 'ok'), 'ok')
  assert.equal(gate.isDown(), false)
})

test('сторож сети: параллельные попытки идут по одной, после первой неудачи — без ожидания', async () => {
  const gate = new OfflineGate('test')
  let calls = 0
  const results = await Promise.allSettled(
    [1, 2, 3, 4, 5].map(() =>
      gate.run(async () => {
        calls++
        throw new Error('timeout')
      })
    )
  )
  assert.equal(calls, 1, 'в сеть ходили один раз, а не пять')
  assert.ok(results.every((r) => r.status === 'rejected'))
  assert.equal(results.slice(1).filter((r) => r.status === 'rejected' && isOfflineError(r.reason)).length, 4)
})

test('каталог: встроенная копия отдаётся сразу, сеть не ждём', async () => {
  const refresher = new BackgroundRefresher()
  let networkStarted = 0
  const started = Date.now()
  const spec = await specWithFallback(
    'bundles',
    {
      readCache: async () => null,
      loadBundled: async () => ({ spec_version: 'bundled' }),
      fetchFromNetwork: () => {
        networkStarted++
        return never() // сеть «висит» вечно
      },
    },
    refresher
  )
  assert.deepEqual(spec, { spec_version: 'bundled' })
  assert.ok(Date.now() - started < 1000)
  assert.equal(networkStarted, 1, 'обновление запущено в фоне')
})

test('каталог: сохранённая копия важнее встроенной; фоновое обновление не повторяется на каждый запрос', async () => {
  let now = 0
  const refresher = new BackgroundRefresher(60 * 60_000, () => now)
  let network = 0
  const sources = {
    readCache: async () => ({ spec_version: 'cached' }),
    loadBundled: async () => ({ spec_version: 'bundled' }),
    fetchFromNetwork: async () => {
      network++
      return true
    },
  }
  for (let i = 0; i < 5; i++) {
    assert.deepEqual(await specWithFallback('maps', sources, refresher), { spec_version: 'cached' })
    await refresher.pending('maps')
  }
  assert.equal(network, 1)
  now += 61 * 60_000
  await specWithFallback('maps', sources, refresher)
  assert.equal(network, 2)
})

test('каталог: без сети («сторож закрыт») фоновое обновление не запускается', async () => {
  const refresher = new BackgroundRefresher()
  let network = 0
  const spec = await specWithFallback(
    'wikipedia',
    {
      readCache: async () => null,
      loadBundled: async () => ({ ok: true }),
      fetchFromNetwork: async () => {
        network++
        return false
      },
    },
    refresher,
    () => false
  )
  assert.deepEqual(spec, { ok: true })
  assert.equal(network, 0)
})

test('модели: estimated_pulls и size бывают null — без падения', () => {
  assert.equal(parsePulls(null), 0)
  assert.equal(parsePulls(undefined), 0)
  assert.equal(parsePulls('1.5M'), 1_500_000)
  assert.equal(parsePulls('12K'), 12_000)
  assert.equal(parsePulls('n/a'), 0)
  assert.equal(parseModelSizeGb(null), 0)
  assert.equal(parseModelSizeGb('4.7GB'), 4.7)
  assert.equal(parseModelSizeGb('900MB'), 0.9)
})

test('сторож сети: ручное «Обновить список» пробует и во время паузы', async () => {
  let now = 1_000
  const gate = new OfflineGate('t', 60_000, () => now)
  await assert.rejects(gate.run(async () => Promise.reject(new Error('timeout'))))
  assert.ok(gate.isDown())
  // Фоновая попытка — сразу «нет сети».
  await assert.rejects(gate.run(async () => 'x'), (e: unknown) => isOfflineError(e))
  // Человек нажал сам — пробуем; удача снимает паузу.
  assert.equal(await gate.run(async () => 'ok', { force: true }), 'ok')
  assert.ok(!gate.isDown())
})
