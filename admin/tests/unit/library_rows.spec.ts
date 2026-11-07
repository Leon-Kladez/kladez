import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { buildTopics, etaMinutes, etaSeconds, fileFromUrl, rowState } from '../../inertia/lib/library_rows.js'

const res = (id: string, size = 100, extra: Record<string, unknown> = {}) => ({
  id,
  version: '2026-10',
  title: id,
  description: `${id} — зачем`,
  url: `https://download.kiwix.org/zim/x/${id}_2026-10.zim`,
  size_mb: size,
  ...extra,
})
const categories = [
  { slug: 'medicine', name: 'Медицина', description: 'м', tiers: [{ slug: 'm1', resources: [res('wikipedia_ru_medicine_maxi', 306)] }, { slug: 'm2', resources: [res('wikipedia_ru_medicine_maxi', 306), res('wikipedia_ru_molcell_maxi', 110)] }] },
  { slug: 'education', name: 'Учёба', description: 'у', tiers: [{ slug: 'e1', resources: [res('wikibooks_ru_all_maxi'), res('drug_data', 50, { type: 'dataset' })] }] },
  { slug: 'empty', name: 'Пусто', description: '', tiers: [] },
] as any
const wiki = [
  { id: 'none', name: 'Нет', description: '', size_mb: 0, url: null },
  { id: 'top-mini', name: 'Самые важные', description: 'кратко', size_mb: 231, url: 'https://download.kiwix.org/zim/wikipedia/wikipedia_ru_top_mini_2026-10.zim' },
] as any

test('темы: Википедия сразу после медицины, повторы и наборы данных убраны, пустые темы скрыты', () => {
  const topics = buildTopics(categories, wiki, { name: 'Википедия', description: 'в' })
  assert.deepEqual(topics.map((t) => t.slug), ['medicine', 'wikipedia', 'education'])
  assert.deepEqual(topics[0].rows.map((r) => r.id), ['wikipedia_ru_medicine_maxi', 'wikipedia_ru_molcell_maxi'])
  assert.deepEqual(topics[1].rows.map((r) => r.id), ['top-mini'])
  assert.deepEqual(topics[2].rows.map((r) => r.id), ['wikibooks_ru_all_maxi'])
  assert.equal(topics[0].rows[0].sizeBytes, 306 * 1024 * 1024)
  assert.equal(topics[0].rows[0].filename, 'wikipedia_ru_medicine_maxi_2026-10.zim')
})

test('строка: есть (в т.ч. другой версии) / качается с % / можно скачать / не скачалось', () => {
  const [medicine, wikiTopic] = buildTopics(categories, wiki, { name: 'В', description: '' })
  const row = medicine.rows[0]
  assert.deepEqual(rowState(row, [], [], null), { state: 'available' })
  assert.deepEqual(rowState(row, ['wikipedia_ru_medicine_maxi_2026-09.zim'], [], null), { state: 'installed' })
  const job = { jobId: '1', url: row.url!, progress: 42.4, filepath: `/app/storage/zim/${row.filename}`, filetype: 'zim', downloadedBytes: 10, totalBytes: 100 }
  const s = rowState(row, [], [job], null)
  assert.equal(s.state, 'downloading')
  assert.equal(s.state === 'downloading' && s.percent, 42)
  assert.deepEqual(rowState(row, [], [{ ...job, status: 'failed' as const }], null), { state: 'failed' })
  const w = wikiTopic.rows[0]
  assert.deepEqual(rowState(w, [], [], { optionId: 'top-mini', status: 'installed' } as any), { state: 'installed' })
  assert.equal(rowState(w, [], [], { optionId: 'top-mini', status: 'downloading' } as any).state, 'downloading')
  assert.deepEqual(rowState(w, [], [], { optionId: 'other', status: 'installed' } as any), { state: 'available' })
})

test('«осталось ~N мин»: по скорости; меньше минуты — 0; скорость неизвестна — null', () => {
  const job = { jobId: '1', url: '', progress: 50, filepath: '', filetype: 'zim', downloadedBytes: 50 * 1024 * 1024, totalBytes: 150 * 1024 * 1024 }
  assert.equal(etaSeconds(job, 0), null)
  assert.equal(etaSeconds({ ...job, totalBytes: undefined }, 1000), null)
  assert.equal(etaMinutes(etaSeconds(job, 1024 * 1024)!), 2) // 100 МБ при 1 МБ/с ≈ 100 с → ~2 мин
  assert.equal(etaMinutes(30), 0)
  assert.equal(fileFromUrl('https://x/y/a_2026-10.zim?x=1'), 'a_2026-10.zim')
  assert.equal(fileFromUrl('https://x/y/a.meta4'), null)
})
