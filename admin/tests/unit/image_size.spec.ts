import { test } from 'node:test'
import assert from 'node:assert/strict'

import { PullProgress, imageLayers, parseImageRef, tokenUrl } from '../../app/utils/image_size.js'

test('название образа: хранилище, имя, версия', () => {
  assert.deepEqual(parseImageRef('ollama/ollama:0.40.16'), {
    registry: 'registry-1.docker.io',
    repository: 'ollama/ollama',
    reference: '0.40.16',
  })
  assert.deepEqual(parseImageRef('redis:7-alpine'), { registry: 'registry-1.docker.io', repository: 'library/redis', reference: '7-alpine' })
  assert.deepEqual(parseImageRef('ghcr.io/kiwix/kiwix-serve:3.8.2'), {
    registry: 'ghcr.io',
    repository: 'kiwix/kiwix-serve',
    reference: '3.8.2',
  })
  assert.equal(parseImageRef('localhost:5000/app').reference, 'latest')
  assert.equal(parseImageRef('localhost:5000/app').registry, 'localhost:5000')
  assert.equal(parseImageRef('a/b@sha256:abc').reference, 'sha256:abc')
})

test('анонимный ключ хранилища по ответу 401', () => {
  assert.equal(
    tokenUrl('Bearer realm="https://auth.docker.io/token",service="registry.docker.io",scope="repository:ollama/ollama:pull"'),
    'https://auth.docker.io/token?service=registry.docker.io&scope=repository%3Aollama%2Follama%3Apull'
  )
  assert.equal(tokenUrl('Basic realm="x"'), null)
})

test('размер образа: список платформ → нужная → сумма слоёв; ключ берётся сам', async () => {
  const calls: string[] = []
  const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers })
  const fake = (async (url: string, init?: RequestInit) => {
    calls.push(url)
    const auth = (init?.headers as Record<string, string> | undefined)?.Authorization
    if (url.startsWith('https://auth.')) return json({ token: 'T' })
    if (!auth) return json({}, 401, { 'www-authenticate': 'Bearer realm="https://auth.example/token",service="s",scope="x"' })
    if (url.endsWith('/manifests/0.40.16'))
      return json({ manifests: [{ digest: 'sha256:arm', platform: { os: 'linux', architecture: 'arm64' } }, { digest: 'sha256:amd', platform: { os: 'linux', architecture: 'amd64' } }] })
    if (url.endsWith('/manifests/sha256:amd'))
      return json({ layers: [{ digest: 'sha256:aaaaaaaaaaaa1', size: 1000 }, { digest: 'sha256:bbbbbbbbbbbb2', size: 3000 }] })
    return json({}, 404)
  }) as unknown as typeof fetch
  const layers = await imageLayers('ollama/ollama:0.40.16', fake)
  assert.equal(layers?.reduce((n, l) => n + l.size, 0), 4000)
  assert.ok(calls.some((c) => c.includes('sha256:amd')))
})

test('нет связи с хранилищем — размер неизвестен, без ошибки', async () => {
  const broken = (async () => {
    throw new Error('offline')
  }) as unknown as typeof fetch
  assert.equal(await imageLayers('ollama/ollama:0.40.16', broken), null)
})

test('проценты по событиям docker pull: качается, уже есть, готово', () => {
  const p = new PullProgress([
    { digest: 'sha256:aaaaaaaaaaaa1', size: 1000 },
    { digest: 'sha256:bbbbbbbbbbbb2', size: 3000 },
  ])
  assert.equal(p.total, 4000)
  assert.equal(p.percent(p.update({ id: 'aaaaaaaaaaaa', status: 'Already exists' })), 25)
  assert.equal(p.percent(p.update({ id: 'bbbbbbbbbbbb', status: 'Downloading', progressDetail: { current: 1500 } })), 62)
  assert.equal(p.percent(p.update({ id: 'bbbbbbbbbbbb', status: 'Download complete' })), 99, '100 % — только когда всё распаковано')
  const unknown = new PullProgress(null)
  assert.equal(unknown.percent(unknown.update({ id: 'x', status: 'Downloading', progressDetail: { current: 5 } })), null)
})
