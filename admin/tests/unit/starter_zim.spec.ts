import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { STARTER_ZIM, STARTER_ZIM_MIRRORS } from '../../constants/kladez.js'

const ROOT = join(import.meta.dirname, '..', '..', '..')

test('стартовый файл — медицинская Википедия; во всех источниках одно имя', () => {
  assert.match(STARTER_ZIM.filename, /^wikipedia_ru_medicine_nopic_\d{4}-\d{2}\.zim$/)
  assert.match(STARTER_ZIM.sha256, /^[0-9a-f]{64}$/)
  assert.ok(STARTER_ZIM.urls.length >= 2)
  assert.ok(STARTER_ZIM.urls[0].startsWith('https://download.kiwix.org/zim/wikipedia/'), 'сначала сам Kiwix')
  for (const url of STARTER_ZIM.urls) assert.ok(url.endsWith('/wikipedia/' + STARTER_ZIM.filename), url)
  assert.equal(STARTER_ZIM.bundledPath, '/app/assets/kiwix/' + STARTER_ZIM.filename)
})

test('запасные адреса — проверенные зеркала из collections-ru/mirrors.json', () => {
  const spec = JSON.parse(readFileSync(join(ROOT, 'collections-ru', 'mirrors.json'), 'utf8'))
  const ok = [spec.kiwix.primary, ...spec.kiwix.mirrors.filter((m: any) => m.ru_check === 'ok').map((m: any) => m.base)]
  for (const base of STARTER_ZIM_MIRRORS) assert.ok(ok.includes(base), `${base} нет среди проверенных зеркал`)
})

test('Dockerfile качает тот же файл с той же суммой и кладёт его в образ', () => {
  const df = readFileSync(join(ROOT, 'Dockerfile'), 'utf8')
  assert.ok(df.includes(`ARG STARTER_ZIM_FILE=${STARTER_ZIM.filename}`))
  assert.ok(df.includes(`ARG STARTER_ZIM_SHA256=${STARTER_ZIM.sha256}`))
  assert.ok(df.includes('sha256sum -c -'), 'сумма проверяется при сборке')
  assert.ok(df.includes(`COPY --from=starter-zim /out/${STARTER_ZIM.filename} ${STARTER_ZIM.bundledPath}`))
  assert.doesNotMatch(df, /vikidia/i, 'Викидии в образе больше нет')
})

test('файла нет в репозитории (больше лимита GitHub), Викидия убрана', () => {
  assert.ok(!existsSync(join(ROOT, 'install', STARTER_ZIM.filename)))
  assert.ok(!existsSync(join(ROOT, 'install', 'vikidia_ru_all_nopic_2026-09.zim')))
})
