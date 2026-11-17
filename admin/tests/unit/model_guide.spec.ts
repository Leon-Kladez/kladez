import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MODEL_GUIDE, installedFit, modelGuide } from '../../app/utils/model_guide.js'

const GB = 1024 ** 3
const rec = (purpose: 'chat' | 'code' | 'images', mem: number, cpus: number, gpu = false) =>
  modelGuide(purpose, mem, cpus, gpu).find((m) => m.recommended)?.name

test('по 10 моделей в каждом разделе, от лёгких к сильным, без повторов', () => {
  for (const [purpose, list] of Object.entries(MODEL_GUIDE)) {
    assert.equal(list.length, 10, purpose)
    assert.equal(new Set(list.map((m) => m.name)).size, 10, `${purpose}: без повторов`)
    for (let i = 1; i < list.length; i++) assert.ok(list[i].bytes >= list[i - 1].bytes * 0.9, `${purpose}: порядок`)
  }
})

test('слабый компьютер без видеокарты (16 ГБ, 4 потока): быстрые подходят, большие — «медленно» или «не потянет»', () => {
  const chat = modelGuide('chat', 16 * GB, 4, false)
  assert.equal(chat.find((m) => m.recommended)?.name, 'qwen2.5:3b')
  assert.equal(chat.find((m) => m.name === 'qwen2.5:7b')?.fit, 'slow')
  assert.equal(chat.find((m) => m.name === 'qwen2.5:72b')?.fit, 'too-big')
  assert.equal(rec('code', 16 * GB, 4), 'qwen2.5-coder:3b')
  assert.equal(rec('images', 16 * GB, 4), 'qwen2.5vl:3b', 'для картинок — самая лёгкая с русским')
})

test('мощный компьютер с видеокартой: рекомендуем сильные', () => {
  assert.equal(rec('chat', 64 * GB, 16, true), 'qwen2.5:32b')
  assert.equal(rec('code', 64 * GB, 16, true), 'qwen2.5-coder:32b')
})

test('оценка установленной модели совпадает с подборкой', () => {
  assert.equal(installedFit(4.68e9, 16 * GB, 4, false), 'slow')
  assert.equal(installedFit(1.93e9, 16 * GB, 4, false), 'good')
  assert.equal(installedFit(47.4e9, 16 * GB, 4, false), 'too-big')
})
