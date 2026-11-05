import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  catalogBaseUrl,
  catalogUrl,
  mapsCatalogUrl,
  DEFAULT_CATALOG_BASE_URL,
} from '../../app/utils/catalog_source.js'

test('default catalog points at the kladez repository', () => {
  assert.equal(
    catalogUrl('wikipedia'),
    'https://raw.githubusercontent.com/Leon-Kladez/kladez/main/collections-ru/wikipedia.json'
  )
})

test('custom base gets a trailing slash added', () => {
  assert.equal(
    catalogUrl('zim_categories', 'https://example.org/cat'),
    'https://example.org/cat/kiwix-categories.json'
  )
  assert.equal(catalogUrl('maps', 'https://example.org/cat/'), 'https://example.org/cat/maps.json')
})

test('invalid base falls back to the default', () => {
  assert.equal(catalogBaseUrl('not a url'), DEFAULT_CATALOG_BASE_URL)
  assert.equal(catalogBaseUrl(''), DEFAULT_CATALOG_BASE_URL)
  assert.equal(catalogBaseUrl(undefined), DEFAULT_CATALOG_BASE_URL)
})

test('maps catalog URL can be set separately from the catalog base', () => {
  const release = 'https://github.com/x/kladez-maps/releases/latest/download/maps.json'
  assert.equal(mapsCatalogUrl(release), release)
  assert.equal(mapsCatalogUrl(undefined, 'https://example.org/cat'), 'https://example.org/cat/maps.json')
  assert.equal(mapsCatalogUrl('garbage', 'https://example.org/cat'), 'https://example.org/cat/maps.json')
})
