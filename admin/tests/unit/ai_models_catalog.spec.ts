import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { modelsFromCatalog } from '../../app/utils/ai_models.js'

const file = JSON.parse(
  readFileSync(join(process.cwd(), '..', 'collections-ru', 'ai-models.json'), 'utf-8')
)

test('the Kladez AI model list is usable offline: only local (non-cloud) models', () => {
  const models = modelsFromCatalog(file)!
  assert.ok(models.length > 100)
  for (const m of models) {
    assert.ok(m.tags.length > 0, m.name)
    assert.ok(m.tags.every((t) => !t.cloud), m.name)
  }
})

test('models known to understand Russian are marked', () => {
  const byName = new Map(modelsFromCatalog(file)!.map((m) => [m.name, m]))
  assert.equal(byName.get('qwen3')?.ru, 'good')
  assert.equal(byName.get('gemma3')?.ru, 'good')
  assert.equal(byName.get('aya-expanse')?.ru, 'good')
  assert.equal(byName.get('llama3.1')?.ru, 'fair')
  for (const m of byName.values()) assert.ok([undefined, 'good', 'fair'].includes(m.ru), m.name)
})

test('cloud-only tags are dropped and an empty or broken answer gives null', () => {
  const out = modelsFromCatalog({
    models: [
      { name: 'a', tags: [{ name: 'a:1', cloud: true }, { name: 'a:2', cloud: false }] },
      { name: 'b', tags: [{ name: 'b:cloud', cloud: 1 }] },
    ],
  } as any)!
  assert.deepEqual(out.map((m) => [m.name, m.tags.map((t) => t.name)]), [['a', ['a:2']]])
  assert.equal(modelsFromCatalog({ models: [] } as any), null)
  assert.equal(modelsFromCatalog({ nope: 1 } as any), null)
  assert.equal(modelsFromCatalog(null), null)
})
