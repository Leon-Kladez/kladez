import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  deviceAccess,
  isComputerClient,
  isLoopback,
  isReadOnlySafe,
  isRequestAllowed,
  normalizeIp,
  parseDefaultGateways,
  parseTrustedList,
  PHONE_READ_ONLY_CODE,
} from '../../app/utils/phone_access.js'
import PhoneAccessMiddleware, {
  type PhoneAccessDeps,
} from '../../app/middleware/phone_access_middleware.js'
import { DEFAULT_LOCALE, setLocale, t } from '../../constants/i18n/index.js'

// Шлюз сети Docker внутри контейнера (адрес docker-proxy, через который приходит localhost компьютера).
const DOCKER_GW = '10.214.0.1'
// Адрес Windows со стороны WSL: так приходят ТЕЛЕФОНЫ через netsh portproxy.
const WSL_HOST = '172.27.160.1'

test('normalizeIp: IPv4 в IPv6, зона, регистр', () => {
  assert.equal(normalizeIp('::ffff:192.168.1.5'), '192.168.1.5')
  assert.equal(normalizeIp('FE80::1%eth0'), 'fe80::1')
  assert.equal(normalizeIp(undefined), '')
})

test('isLoopback', () => {
  assert.ok(isLoopback('127.0.0.1'))
  assert.ok(isLoopback('127.1.2.3'))
  assert.ok(isLoopback('::1'))
  assert.ok(isLoopback('::ffff:127.0.0.1'))
  assert.ok(!isLoopback('192.168.1.5'))
  assert.ok(!isLoopback('1270.0.0.1'))
  assert.ok(!isLoopback(''))
})

test('parseDefaultGateways: шлюз по умолчанию из /proc/net/route', () => {
  const route = [
    'Iface\tDestination\tGateway \tFlags\tRefCnt\tUse\tMetric\tMask\t\tMTU\tWindow\tIRTT',
    'eth0\t00000000\t0100D60A\t0003\t0\t0\t0\t00000000\t0\t0\t0',
    'eth0\t0000D60A\t00000000\t0001\t0\t0\t0\t00FFFFFF\t0\t0\t0',
    '',
  ].join('\n')
  assert.deepEqual(parseDefaultGateways(route), [DOCKER_GW])
  assert.deepEqual(parseDefaultGateways(''), [])
  assert.deepEqual(parseDefaultGateways('Iface\tDestination\tGateway\neth0\t00000000\tzzzz'), [])
})

test('parseTrustedList', () => {
  assert.deepEqual(parseTrustedList(' 10.0.0.1, ::ffff:10.0.0.2;10.0.0.3 '), [
    '10.0.0.1',
    '10.0.0.2',
    '10.0.0.3',
  ])
  assert.deepEqual(parseTrustedList(undefined), [])
})

test('компьютер: loopback и шлюз Docker; телефон: всё остальное, включая адрес WSL-хоста', () => {
  const trusted = [DOCKER_GW]
  assert.ok(isComputerClient('127.0.0.1', trusted))
  assert.ok(isComputerClient('::1', trusted))
  assert.ok(isComputerClient(DOCKER_GW, trusted))
  assert.ok(isComputerClient(`::ffff:${DOCKER_GW}`, trusted))
  assert.ok(!isComputerClient(WSL_HOST, trusted), 'portproxy-путь — это телефоны')
  assert.ok(!isComputerClient('192.168.1.20', trusted))
  assert.ok(!isComputerClient('10.214.0.7', trusted), 'соседний контейнер — не компьютер')
  assert.ok(!isComputerClient(undefined, trusted))
  assert.ok(!isComputerClient('', ['']))
})

test('isReadOnlySafe: чтение и разговор с ИИ — можно, остальное — нет', () => {
  for (const [m, p] of [
    ['GET', '/api/system/services'],
    ['HEAD', '/'],
    ['OPTIONS', '/api/zim/list'],
    ['POST', '/__transmit/subscribe'],
    ['POST', '/__transmit/unsubscribe'],
    ['POST', '/api/ollama/chat'],
    ['POST', '/api/ollama/chat/'],
    ['POST', '/api/ollama/unload-chat-models'],
    ['POST', '/api/chat/sessions'],
    ['PUT', '/api/chat/sessions/42'],
    ['POST', '/api/chat/sessions/42/messages'],
    ['post', '/api/chat/sessions?x=1'],
  ] as const) {
    assert.ok(isReadOnlySafe(m, p), `${m} ${p}`)
  }
  for (const [m, p] of [
    ['PATCH', '/api/system/settings'],
    ['POST', '/api/system/services/install'],
    ['POST', '/api/system/services/uninstall'],
    ['DELETE', '/api/zim/wikipedia_ru.zim'],
    ['POST', '/api/zim/download-remote'],
    ['POST', '/api/zim/upload'],
    ['POST', '/api/maps/markers'],
    ['POST', '/api/easy-setup/bundles/install'],
    ['DELETE', '/api/chat/sessions/42'],
    ['DELETE', '/api/chat/sessions/all'],
    ['POST', '/api/ollama/models'],
    ['POST', '/api/rag/upload'],
    ['POST', '/api/system/update'],
    ['PUT', '/api/chat/sessions/42/messages'],
    ['POST', '/api/ollama/chat/extra'],
    ['POST', '/__transmit/other'],
  ] as const) {
    assert.ok(!isReadOnlySafe(m, p), `${m} ${p}`)
  }
})

test('deviceAccess / isRequestAllowed', () => {
  assert.deepEqual(deviceAccess(true, false), { isComputer: true, canChange: true })
  assert.deepEqual(deviceAccess(false, false), { isComputer: false, canChange: false })
  assert.deepEqual(deviceAccess(false, true), { isComputer: false, canChange: true })
  assert.ok(isRequestAllowed(deviceAccess(false, false), 'GET', '/settings/system'))
  assert.ok(!isRequestAllowed(deviceAccess(false, false), 'PATCH', '/api/system/settings'))
  assert.ok(isRequestAllowed(deviceAccess(false, true), 'PATCH', '/api/system/settings'))
})

// --- middleware ---

type FakeCtx = {
  device?: { isComputer: boolean; canChange: boolean }
  request: {
    request: { socket: { remoteAddress?: string } }
    method: () => string
    url: () => string
  }
  response: {
    status: (code: number) => FakeCtx['response']
    json: (body: unknown) => unknown
    sent?: { code: number; body: any }
  }
}

function fakeCtx(remoteAddress: string | undefined, method: string, url: string): FakeCtx {
  let code = 200
  const response: FakeCtx['response'] = {
    status(c: number) {
      code = c
      return response
    },
    json(body: unknown) {
      response.sent = { code, body }
      return body
    },
  }
  return {
    request: { request: { socket: { remoteAddress } }, method: () => method, url: () => url },
    response,
  }
}

function middleware(phonesMayChange = false, trusted = [DOCKER_GW]) {
  let asked = 0
  const deps: PhoneAccessDeps = {
    trusted: () => trusted,
    phonesMayChange: async () => {
      asked++
      return phonesMayChange
    },
  }
  return { mw: new PhoneAccessMiddleware(deps), asked: () => asked }
}

async function run(mw: PhoneAccessMiddleware, ctx: FakeCtx) {
  let nextCalled = false
  await mw.handle(ctx as any, async () => {
    nextCalled = true
  })
  return nextCalled
}

test('middleware: компьютер может всё и не спрашивает настройку', async () => {
  const { mw, asked } = middleware()
  for (const ip of ['127.0.0.1', '::1', DOCKER_GW]) {
    const ctx = fakeCtx(ip, 'PATCH', '/api/system/settings')
    assert.equal(await run(mw, ctx), true, ip)
    assert.deepEqual(ctx.device, { isComputer: true, canChange: true })
    assert.equal(ctx.response.sent, undefined)
  }
  assert.equal(asked(), 0)
})

test('middleware: телефон читает и говорит с ИИ', async () => {
  const { mw } = middleware()
  for (const [m, p] of [
    ['GET', '/home'],
    ['GET', '/api/zim/list'],
    ['POST', '/api/ollama/chat'],
    ['POST', '/__transmit/subscribe'],
  ] as const) {
    const ctx = fakeCtx(WSL_HOST, m, p)
    assert.equal(await run(mw, ctx), true, `${m} ${p}`)
    assert.deepEqual(ctx.device, { isComputer: false, canChange: false })
  }
})

test('middleware: телефон не меняет — 403 и понятный текст', async () => {
  setLocale('ru')
  try {
    const { mw } = middleware()
    for (const [m, p] of [
      ['PATCH', '/api/system/settings'],
      ['POST', '/api/system/services/install'],
      ['DELETE', '/api/zim/x.zim'],
      ['POST', '/api/zim/download-remote'],
    ] as const) {
      const ctx = fakeCtx('192.168.1.20', m, p)
      assert.equal(await run(mw, ctx), false, `${m} ${p}`)
      assert.equal(ctx.response.sent?.code, 403)
      assert.equal(ctx.response.sent?.body.code, PHONE_READ_ONLY_CODE)
      assert.equal(ctx.response.sent?.body.success, false)
      assert.equal(ctx.response.sent?.body.message, 'Изменять можно только на компьютере.')
    }
  } finally {
    setLocale(DEFAULT_LOCALE)
  }
})

test('middleware: X-Forwarded-For не помогает — смотрим только на сокет', async () => {
  const { mw } = middleware()
  const ctx = fakeCtx(WSL_HOST, 'POST', '/api/system/services/install') as FakeCtx & {
    headers?: unknown
  }
  ;(ctx.request as any).header = () => '127.0.0.1'
  ;(ctx.request as any).ip = () => '127.0.0.1'
  assert.equal(await run(mw, ctx), false)
})

test('middleware: если в Настройках разрешено — телефон может менять', async () => {
  const { mw, asked } = middleware(true)
  const ctx = fakeCtx('192.168.1.20', 'POST', '/api/system/services/install')
  assert.equal(await run(mw, ctx), true)
  assert.deepEqual(ctx.device, { isComputer: false, canChange: true })
  assert.equal(asked(), 1)
})

test('текст ошибки есть на обоих языках', () => {
  setLocale('en')
  try {
    assert.equal(t('phones.readOnly.error'), 'Changes can only be made on the computer.')
  } finally {
    setLocale(DEFAULT_LOCALE)
  }
})
