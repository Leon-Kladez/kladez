import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  canStartSet,
  jobForUrl,
  mapSetItems,
  setProgress,
  type SetItem,
} from '../../inertia/lib/set_progress.js'
import type { DownloadJobWithProgress } from '../../types/downloads.js'

const res = (id: string, size_mb: number, extra: Record<string, unknown> = {}) => ({
  id,
  version: '2026-11',
  title: id,
  description: '',
  url: `https://example.org/maps/${id}_2026-11.pmtiles`,
  size_mb,
  ...extra,
})
const job = (
  url: string,
  progress: number,
  extra: Partial<DownloadJobWithProgress> = {}
): DownloadJobWithProgress => ({
  jobId: url,
  url,
  progress,
  filepath: `/app/storage/maps/pmtiles/${url.split('/').pop()}`,
  filetype: 'map',
  status: 'active',
  ...extra,
})

test('карты: черновые (planned) не считаются; все черновые — «пока нельзя скачать», нажать нельзя', () => {
  const resources = [res('a', 100, { planned: true }), res('b', 100, { planned: true })]
  const p = setProgress(mapSetItems(resources, [], []))
  assert.deepEqual(p, { state: 'unavailable' })
  assert.equal(canStartSet(p), false)
  assert.equal(mapSetItems([res('a', 1), res('b', 1, { planned: true })], [], []).length, 1)
})

test('ничего не начато → idle (можно нажать); часть на диске → «скачано N из M»', () => {
  const resources = [res('a', 100), res('b', 300)]
  assert.deepEqual(setProgress(mapSetItems(resources, [], [])), {
    state: 'idle',
    installed: 0,
    total: 2,
  })
  const partial = setProgress(mapSetItems(resources, ['a'], []))
  assert.deepEqual(partial, { state: 'idle', installed: 1, total: 2 })
  assert.equal(canStartSet(partial), true)
})

test('качается: процент — доля байтов набора, с учётом уже скачанных; не больше 99', () => {
  const resources = [res('a', 100), res('b', 300)]
  const [a, b] = resources.map((r) => r.url)
  // a на диске (100 МБ), b скачан наполовину (150 из 300) → 250/400 = 62 %
  const p = setProgress(mapSetItems(resources, ['a'], [job(b, 50)]))
  assert.deepEqual(p, { state: 'downloading', percent: 62, phase: 'running' })
  assert.equal(canStartSet(p), false)
  // оба по 100 % (ещё проверяются) — всё равно 99, а не 100
  const almost = setProgress(mapSetItems(resources, [], [job(a, 100), job(b, 100)]))
  assert.equal(almost.state === 'downloading' && almost.percent, 99)
})

test('фаза: ждёт очереди / повтор после ошибки (delayed с причиной) / идёт', () => {
  const resources = [res('a', 100)]
  const url = resources[0].url
  const waiting = setProgress(mapSetItems(resources, [], [job(url, 0, { status: 'waiting' })]))
  assert.equal(waiting.state === 'downloading' && waiting.phase, 'waiting')
  const delayedNoError = setProgress(
    mapSetItems(resources, [], [job(url, 0, { status: 'delayed' })])
  )
  assert.equal(delayedNoError.state === 'downloading' && delayedNoError.phase, 'waiting')
  const retrying = setProgress(
    mapSetItems(resources, [], [job(url, 10, { status: 'delayed', failedReason: 'нет связи' })])
  )
  assert.equal(retrying.state === 'downloading' && retrying.phase, 'retrying')
  const retrying2 = setProgress(
    mapSetItems(resources, [], [job(url, 10, { status: 'delayed', attemptsMade: 2 })])
  )
  assert.equal(retrying2.state === 'downloading' && retrying2.phase, 'retrying')
})

test('ошибка: все сорвались — failed (нажать можно, чтобы повторить); пока другие качаются — downloading', () => {
  const resources = [res('a', 100), res('b', 100)]
  const [a, b] = resources.map((r) => r.url)
  const failed = setProgress(
    mapSetItems(resources, [], [job(a, 0, { status: 'failed' }), job(b, 0, { status: 'failed' })])
  )
  assert.deepEqual(failed, { state: 'failed', failed: 2, total: 2 })
  assert.equal(canStartSet(failed), true)
  const some = setProgress(mapSetItems(resources, ['b'], [job(a, 0, { status: 'failed' })]))
  assert.deepEqual(some, { state: 'failed', failed: 1, total: 2 })
  const mixed = setProgress(
    mapSetItems(resources, [], [job(a, 0, { status: 'failed' }), job(b, 40)])
  )
  assert.equal(mixed.state, 'downloading')
})

test('всё на диске → «Скачано», нажать нельзя', () => {
  const p = setProgress(
    mapSetItems([res('a', 1), res('b', 2), res('c', 3, { planned: true })], ['a', 'b'], [])
  )
  assert.deepEqual(p, { state: 'installed' })
  assert.equal(canStartSet(p), false)
})

test('загрузка находится по адресу или по имени файла на диске (в т.ч. путь Windows)', () => {
  const url = 'https://example.org/maps/x_2026-11.pmtiles'
  assert.equal(jobForUrl([job(url, 1)], url)?.jobId, url)
  const other = { ...job('https://mirror.example/x_2026-11.pmtiles', 1), jobId: 'm' }
  assert.equal(jobForUrl([other], url)?.jobId, 'm')
  const win = { ...other, url: 'https://elsewhere/zzz', filepath: 'C:\\storage\\x_2026-11.pmtiles' }
  assert.equal(jobForUrl([win], url)?.jobId, 'm')
  assert.equal(jobForUrl([job('https://example.org/maps/y.pmtiles', 1)], url), undefined)
  assert.equal(jobForUrl([job(url, 1)], null), undefined)
})

test('размеры неизвестны — файлы считаются поровну', () => {
  const items: SetItem[] = [
    { sizeBytes: 0, state: 'installed' },
    { sizeBytes: 0, state: 'downloading', percent: 50, job: null },
  ]
  const p = setProgress(items)
  assert.equal(p.state === 'downloading' && p.percent, 75)
})
