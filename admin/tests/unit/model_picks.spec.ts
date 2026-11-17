import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MODEL_PICKS, modelFit, modelPicks } from '../../app/utils/model_picks.js'

const GB = 1024 ** 3

test('модели «Быстрой настройки»: только с русским, от быстрой к умной, без служебных', () => {
  const picks = modelPicks(16 * GB)
  assert.equal(picks.length, MODEL_PICKS.length)
  assert.ok(picks.every((m) => m.ru === 'good'))
  assert.ok(!picks.some((m) => /minilm|embed/i.test(m.name)), 'служебных моделей нет')
  assert.ok(picks.every((m) => m.tags[0].name === m.name), 'скачивается ровно эта модель')
})

test('потянет ли компьютер: с запасом — хорошо, впритык — медленно, мало — нет', () => {
  assert.equal(modelFit(4.7 * GB, 32 * GB), 'good')
  assert.equal(modelFit(4.7 * GB, 8 * GB), 'slow')
  assert.equal(modelFit(8.1 * GB, 8 * GB), 'too-big')
  assert.equal(modelFit(30 * GB, null), 'good', 'память неизвестна — не пугаем')
})

test('рекомендуем самую умную из тех, что работают хорошо, но не тяжелее 7B', () => {
  const rec = (mem: number | null) => modelPicks(mem).find((m) => m.kladez.recommended)?.name
  assert.equal(rec(16 * GB), 'qwen2.5:7b')
  assert.equal(rec(64 * GB), 'qwen2.5:7b')
  assert.equal(rec(8 * GB), 'qwen2.5:3b')
  assert.equal(rec(4 * GB), 'qwen2.5:1.5b')
  assert.equal(modelPicks(4 * GB).find((m) => m.name === 'gemma3:12b')?.kladez.fit, 'too-big')
})

test('слабый процессор: рекомендуем быструю модель, даже если памяти много', () => {
  const rec = (mem: number, cpus: number) => modelPicks(mem, cpus).find((m) => m.kladez.recommended)?.name
  assert.equal(rec(16 * GB, 4), 'qwen2.5:3b')
  assert.equal(rec(16 * GB, 8), 'qwen2.5:7b')
})
