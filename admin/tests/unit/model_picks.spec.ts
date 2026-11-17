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
  assert.ok(
    picks.filter((m) => m.kladez.group !== 'english' && !m.tags[0].thinking).every((m) => m.ru === 'good'),
    'обычные и мощные — с русским'
  )
  assert.ok(picks.filter((m) => m.kladez.group === 'english').every((m) => m.ru !== 'good'), 'английские честно помечены')
  assert.ok(picks.some((m) => m.name.startsWith('deepseek-r1')), 'DeepSeek есть среди мощных')
})

test('потянет ли компьютер: с запасом — хорошо, впритык — медленно, мало — нет', () => {
  assert.equal(modelFit(4.7 * GB, 32 * GB), 'good')
  assert.equal(modelFit(4.7 * GB, 8 * GB), 'slow')
  assert.equal(modelFit(8.1 * GB, 8 * GB), 'too-big')
  assert.equal(modelFit(30 * GB, null), 'good', 'память неизвестна — не пугаем')
})

test('рекомендация по памяти и процессору без видеокарты', () => {
  assert.equal(rec(4 * GB), 'qwen3.5:0.8b', 'памяти совсем мало — самая лёгкая')
  assert.equal(rec(8 * GB), 'qwen3.5:4b')
  assert.equal(rec(16 * GB, 8), 'qwen3.5:9b')
  assert.equal(rec(16 * GB, 4), 'qwen3.5:4b', 'слабый процессор (замер: так же быстра, как qwen2.5:3b)')
  assert.equal(rec(64 * GB, 16), 'qwen3.5:35b-a3b', 'много памяти без видеокарты — модель из «экспертов»')
})

test('с видеокартой рекомендуем модели для мощного компьютера; английские и «думающие» — никогда', () => {
  assert.equal(rec(64 * GB, 16, true), 'qwen3.5:27b')
  assert.equal(rec(32 * GB, 8, true), 'qwen3.5:27b')
  assert.equal(rec(24 * GB, 8, true), 'gemma4:12b', '27B на 24 ГБ — впритык, не рекомендуем')
  const best = rec(128 * GB, 32, true)!
  assert.ok(!['llama3.1:8b', 'gpt-oss:20b', 'llama3.3:70b', 'deepseek-r1:32b'].includes(best))
  assert.equal(modelPicks(16 * GB).find((m) => m.name === 'llama3.3:70b')?.kladez.fit, 'too-big')
})
