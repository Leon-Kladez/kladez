import { test } from 'node:test'
import assert from 'node:assert/strict'

import { MODEL_PICKS, modelFit, modelPicks } from '../../app/utils/model_picks.js'

const GB = 1024 ** 3
const rec = (mem: number | null, cpus: number | null = null, gpu = false) =>
  modelPicks(mem, cpus, gpu).find((m) => m.kladez.recommended)?.name

test('модели «Быстрой настройки»: три ряда, без служебных, скачивается ровно выбранная', () => {
  const picks = modelPicks(16 * GB)
  assert.equal(picks.length, MODEL_PICKS.length)
  assert.deepEqual([...new Set(picks.map((m) => m.kladez.group))], ['home', 'power', 'english'])
  assert.ok(!picks.some((m) => /minilm|embed/i.test(m.name)), 'служебных моделей нет')
  assert.ok(picks.every((m) => m.tags[0].name === m.name))
  assert.ok(picks.filter((m) => m.kladez.group !== 'english').every((m) => m.ru === 'good'), 'обычные и мощные — с русским')
  assert.ok(picks.filter((m) => m.kladez.group === 'english').every((m) => m.ru !== 'good'), 'английские честно помечены')
})

test('потянет ли компьютер: с запасом — хорошо, впритык — медленно, мало — нет', () => {
  assert.equal(modelFit(4.7 * GB, 32 * GB), 'good')
  assert.equal(modelFit(4.7 * GB, 8 * GB), 'slow')
  assert.equal(modelFit(8.1 * GB, 8 * GB), 'too-big')
  assert.equal(modelFit(30 * GB, null), 'good', 'память неизвестна — не пугаем')
})

test('рекомендация по памяти и процессору без видеокарты', () => {
  assert.equal(rec(4 * GB), 'qwen2.5:1.5b')
  assert.equal(rec(8 * GB), 'qwen2.5:3b')
  assert.equal(rec(16 * GB, 8), 'qwen2.5:7b')
  assert.equal(rec(16 * GB, 4), 'qwen2.5:3b', 'слабый процессор — быстрая модель')
  assert.equal(rec(64 * GB, 16), 'qwen2.5:14b', 'мощный процессор — сильная')
})

test('с видеокартой рекомендуем модели для мощного компьютера, английские — никогда', () => {
  assert.equal(rec(64 * GB, 16, true), 'gemma3:27b')
  assert.equal(rec(32 * GB, 8, true), 'gemma3:27b')
  assert.equal(rec(24 * GB, 8, true), 'qwen2.5:14b', '27B на 24 ГБ — впритык, не рекомендуем')
  assert.ok(!['llama3.1:8b', 'phi4:14b', 'llama3.3:70b'].includes(rec(128 * GB, 32, true)!))
  assert.equal(modelPicks(16 * GB).find((m) => m.name === 'qwen2.5:72b')?.kladez.fit, 'too-big')
})
