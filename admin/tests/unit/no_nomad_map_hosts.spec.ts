import * as assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// Карты Кладезя не должны зависеть от серверов NOMAD (описание части 3, §1.4).
const FILES = [
  'app/services/kiwix_catalog_service.ts',
  'app/services/map_service.ts',
  'app/services/collection_manifest_service.ts',
  'app/services/collection_update_service.ts',
  'constants/map_regions.ts',
]

test('в коде карт нет адресов репозитория карт NOMAD', () => {
  for (const f of FILES) {
    const src = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8')
    assert.ok(!src.includes('project-nomad-maps'), `${f} ссылается на project-nomad-maps`)
  }
})
