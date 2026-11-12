import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  canStartSet,
  jobForUrl,
  mapSetItems,
  setProgress,
  tierResources,
  zimSetItems,
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

test('уровень темы: свои файлы плюс включённые уровни, без зацикливания', () => {
  const tiers = [
    { name: 'A', slug: 'a', description: '', resources: [res('x', 1)] },
    { name: 'B', slug: 'b', description: '', includesTier: 'a', resources: [res('y', 2)] },
    { name: 'C', slug: 'c', description: '', includesTier: 'c', resources: [res('z', 3)] },
  ]
  assert.deepEqual(tierResources(tiers, 'b').map((r) => r.id), ['y', 'x'])
  assert.deepEqual(tierResources(tiers, 'c').map((r) => r.id), ['z'])
  assert.deepEqual(tierResources(tiers, 'nope'), [])
})

test('книжный набор: скачанное по имени файла, идущее — по загрузкам, причина повтора', () => {
  const a = res('a', 100)
  const b = res('b', 100)
  const items = zimSetItems([a, b], ['a_2026-11.pmtiles'], [
    job(b.url, 50, { status: 'delayed', failedReason: 'Нет связи' }),
  ])
  assert.deepEqual(items.map((i) => i.state), ['installed', 'downloading'])
  const p = setProgress(items)
  assert.equal(p.state, 'downloading')
  if (p.state === 'downloading') {
    assert.equal(p.percent, 75)
    assert.equal(p.phase, 'retrying')
    assert.equal(p.reason, 'Нет связи')
  }
})

test('общие книги: соседний набор не «скачивается», пока его самого не запустили', () => {
  const a = res('a', 100)
  const b = res('b', 100)
  const items = zimSetItems([a, b], [], [job(a.url, 40)])
  assert.equal(setProgress(items).state, 'downloading')
  const own = setProgress(items, { wholeSet: true })
  assert.equal(own.state, 'idle')
  assert.equal(canStartSet(own), true)
  const all = zimSetItems([a, b], [], [job(a.url, 40), job(b.url, 0)])
  assert.equal(setProgress(all, { wholeSet: true }).state, 'downloading')
})

test('дороги и поиск, которые качаются вместе с картой, входят в процент набора', () => {
  const routes = { url: 'https://example.org/r/routes-x_2026-11.tar', size_mb: 100, version: '2026-11' }
  const search = { url: 'https://example.org/s/search-x_2026-11.sqlite', size_mb: 100, version: '2026-11' }
  // Две части округа делят дороги и поиск: считаются один раз.
  const resources = [res('a', 100, { routes, search }), res('b', 100, { routes, search })]
  // Карты ещё ждут, дороги скачаны наполовину: 50 из 300 МБ (две карты + дороги; поиск
  // ещё не поставлен в очередь — не считается) → 16 %, а не 0.
  const p = setProgress(mapSetItems(resources, [], [job(routes.url, 50)]))
  assert.deepEqual(p, { state: 'downloading', percent: 16, phase: 'running' })
  // Ничего не качается — дороги и поиск не меняют счёт «скачано N из M».
  assert.deepEqual(setProgress(mapSetItems(resources, ['a'], [])), { state: 'idle', installed: 1, total: 2 })
  // Сорвавшаяся загрузка дорог не делает весь набор «не удалось».
  const f = setProgress(mapSetItems(resources, [], [job(routes.url, 0, { status: 'failed' }), job(resources[0].url, 10)]))
  assert.equal(f.state, 'downloading')
})
