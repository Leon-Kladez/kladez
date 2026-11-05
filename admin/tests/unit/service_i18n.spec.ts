import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { localizeService } from '../../app/utils/service_i18n.js'

test('исходные название и описание из каталога NOMAD показываются по-русски', () => {
  const s = localizeService({
    service_name: 'nomad_kiwix_server',
    friendly_name: 'Information Library',
    description: 'Offline access to Wikipedia, medical references, how-to guides, and encyclopedias',
  })
  assert.equal(s.friendly_name, 'Библиотека')
  assert.match(s.description ?? '', /Википедия/)
})

test('название, изменённое пользователем, остаётся как есть', () => {
  const s = localizeService({
    service_name: 'nomad_kiwix_server',
    friendly_name: 'Моя библиотека',
    description: 'My own words',
  })
  assert.equal(s.friendly_name, 'Моя библиотека')
  assert.equal(s.description, 'My own words')
})

test('своё приложение без перевода не меняется', () => {
  const s = localizeService({ service_name: 'custom_app_1', friendly_name: 'Pi-hole', description: null })
  assert.equal(s.friendly_name, 'Pi-hole')
  assert.equal(s.description, null)
})
