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
  assert.ok(MODEL_GUIDE.chat.some((m) => m.name.startsWith('deepseek-r1')), 'DeepSeek в разделе общения')
})

test('слабый компьютер без видеокарты (16 ГБ, 4 потока): быстрые подходят, большие — «медленно» или «не потянет»', () => {
  const chat = modelGuide('chat', 16 * GB, 4, false)
  assert.equal(chat.find((m) => m.recommended)?.name, 'qwen3.5:4b', 'замер: так же быстра, как qwen2.5:3b, и умнее')
  assert.equal(chat.find((m) => m.name === 'qwen3.5:9b')?.fit, 'slow')
  assert.equal(chat.find((m) => m.name === 'qwen3.5:35b-a3b')?.fit, 'too-big')
  assert.equal(rec('code', 16 * GB, 4), 'qwen3.5:4b')
  assert.equal(rec('images', 16 * GB, 4), 'qwen3.5:4b')
})

test('много памяти без видеокарты: модели из «экспертов» — быстрые', () => {
  const chat = modelGuide('chat', 64 * GB, 8, false)
  assert.equal(chat.find((m) => m.name === 'qwen3.5:35b-a3b')?.fit, 'good')
  assert.equal(chat.find((m) => m.name === 'qwen3.5:27b')?.fit, 'slow')
  assert.equal(rec('chat', 64 * GB, 8), 'qwen3.5:35b-a3b')
  assert.equal(rec('code', 64 * GB, 8), 'qwen3-coder:30b')
})

test('мощный компьютер с видеокартой: рекомендуем сильные, «думающий» DeepSeek — только по выбору', () => {
  assert.equal(rec('chat', 64 * GB, 16, true), 'qwen3.5:35b-a3b')
  assert.equal(rec('code', 64 * GB, 16, true), 'qwen2.5-coder:32b')
  assert.notEqual(rec('chat', 128 * GB, 32, true), 'deepseek-r1:32b')
})

test('оценка установленной модели совпадает с подборкой', () => {
  assert.equal(installedFit(4.68e9, 16 * GB, 4, false), 'slow')
  assert.equal(installedFit(1.93e9, 16 * GB, 4, false), 'good')
  assert.equal(installedFit(47.4e9, 16 * GB, 4, false), 'too-big')
  assert.equal(installedFit(3.32e9, 16 * GB, 4, false, 'qwen3.5:4b'), 'good', 'по замеренной скорости, не по размеру файла')
  assert.equal(installedFit(3.32e9, 16 * GB, 4, false), 'slow', 'незнакомая модель того же размера — по размеру')
})
