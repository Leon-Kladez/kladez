import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const wf = readFileSync(new URL('../../../.github/workflows/build-maps.yml', import.meta.url), 'utf8')

test('новый релиз не становится «последним», пока в нём нет maps.json', () => {
  const create = wf.slice(wf.indexOf('gh release create'), wf.indexOf('--notes', wf.indexOf('gh release create')))
  assert.ok(create.includes('--latest=false'), create)
})

test('папка встроенного каталога создаётся перед копированием', () => {
  assert.ok(wf.includes('mkdir -p collections-ru'))
})

test('без настроенного репозитория карт сборка по расписанию не выкладывает', () => {
  assert.ok(wf.includes("vars.KLADEZ_MAPS_REPO == ''"), 'DRY_RUN должен включаться без KLADEZ_MAPS_REPO')
})

test('ввод пользователя не подставляется прямо в shell', () => {
  const bad = wf.split('\n').filter((l) => /\$\{\{[^}]*inputs\.(only|groups)/.test(l) && !/^\s*(ONLY|GROUPS)_INPUT:/.test(l))
  assert.deepEqual(bad, [], 'inputs.only / inputs.groups должны идти через env')
})
