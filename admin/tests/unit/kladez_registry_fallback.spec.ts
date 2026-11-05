import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { tryRegistriesInOrder } from '../../app/utils/kladez_registry.js'

// ContainerRegistryService itself cannot be imported in plain node:test (its logger
// needs a booted AdonisJS app), so the fallback loop lives in a pure helper.

test('tryRegistriesInOrder returns the first registry that succeeds', async () => {
  const tried: string[] = []
  const result = await tryRegistriesInOrder(
    ['registry-1.docker.io', 'mirror.gcr.io', 'dh-mirror.gitverse.ru'],
    async (registry) => {
      tried.push(registry)
      if (registry === 'registry-1.docker.io') throw new Error('Failed to list tags: 403')
      return [`${registry}:7-alpine`]
    }
  )
  assert.deepEqual(result, ['mirror.gcr.io:7-alpine'])
  assert.deepEqual(tried, ['registry-1.docker.io', 'mirror.gcr.io'])
})

test('tryRegistriesInOrder passes isPrimary only for the first registry', async () => {
  const flags: boolean[] = []
  await tryRegistriesInOrder(['a', 'b'], async (_r, isPrimary) => {
    flags.push(isPrimary)
    if (isPrimary) throw new Error('nope')
    return 1
  })
  assert.deepEqual(flags, [true, false])
})

test('tryRegistriesInOrder rethrows the primary error when every registry fails', async () => {
  await assert.rejects(
    tryRegistriesInOrder(['registry-1.docker.io', 'mirror.gcr.io'], async (registry) => {
      throw new Error(`fail ${registry}`)
    }),
    /fail registry-1\.docker\.io/
  )
})
