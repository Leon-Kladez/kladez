import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  registryCandidates,
  parseMirrorList,
  resolveNomadImageRepo,
  UPSTREAM_IMAGE_REPO,
} from '../../app/utils/kladez_registry.js'

// ── registryCandidates ───────────────────────────────────────────────────────

test('registryCandidates: docker hub first, then mirrors', () => {
  assert.deepEqual(
    registryCandidates('registry-1.docker.io', ['https://mirror.gcr.io', 'https://dh-mirror.gitverse.ru']),
    ['registry-1.docker.io', 'mirror.gcr.io', 'dh-mirror.gitverse.ru']
  )
})

test('registryCandidates: mirrors are not used for ghcr.io', () => {
  assert.deepEqual(registryCandidates('ghcr.io', ['https://mirror.gcr.io']), ['ghcr.io'])
})

test('registryCandidates: empty and junk mirror entries ignored', () => {
  assert.deepEqual(registryCandidates('registry-1.docker.io', ['', ' ', 'not a url']), [
    'registry-1.docker.io',
  ])
})

test('registryCandidates: duplicate mirrors and docker hub itself are not repeated', () => {
  assert.deepEqual(
    registryCandidates('registry-1.docker.io', [
      'https://mirror.gcr.io',
      'https://mirror.gcr.io/',
      'https://registry-1.docker.io',
    ]),
    ['registry-1.docker.io', 'mirror.gcr.io']
  )
})

// ── parseMirrorList ──────────────────────────────────────────────────────────

test('parseMirrorList splits KLADEZ_REGISTRY_MIRRORS on commas and trims', () => {
  assert.deepEqual(parseMirrorList(' https://mirror.gcr.io , https://dh-mirror.gitverse.ru,'), [
    'https://mirror.gcr.io',
    'https://dh-mirror.gitverse.ru',
  ])
  assert.deepEqual(parseMirrorList(undefined), [])
  assert.deepEqual(parseMirrorList(''), [])
})

// ── resolveNomadImageRepo ────────────────────────────────────────────────────

test('admin image repo comes from KLADEZ_IMAGE_REPO', () => {
  assert.equal(resolveNomadImageRepo('ghcr.io/aiglobdata/kladez'), 'ghcr.io/aiglobdata/kladez')
})

test('admin image repo falls back to upstream when KLADEZ_IMAGE_REPO is unset or blank', () => {
  assert.equal(UPSTREAM_IMAGE_REPO, 'ghcr.io/crosstalk-solutions/project-nomad')
  assert.equal(resolveNomadImageRepo(undefined), UPSTREAM_IMAGE_REPO)
  assert.equal(resolveNomadImageRepo('   '), UPSTREAM_IMAGE_REPO)
})

test('admin image repo rejects values that could break the updater sed', () => {
  // The repo is interpolated into a sed expression in update-watcher.sh; only plain
  // registry/path characters are allowed, anything else falls back to upstream.
  assert.equal(resolveNomadImageRepo('ghcr.io/x|y'), UPSTREAM_IMAGE_REPO)
  assert.equal(resolveNomadImageRepo('ghcr.io/x y'), UPSTREAM_IMAGE_REPO)
  assert.equal(resolveNomadImageRepo('ghcr.io/x:latest'), UPSTREAM_IMAGE_REPO)
})
