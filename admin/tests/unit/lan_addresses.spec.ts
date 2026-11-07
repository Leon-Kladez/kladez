import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  addressesFromInterfaces,
  adminPortFromEnv,
  isPrivateIPv4,
  parseHostNetworkFile,
  phoneUrl,
  pickLanAddresses,
  qrPath,
} from '../../app/utils/lan_addresses.js'

test('isPrivateIPv4: только адреса домашней сети', () => {
  for (const ip of ['192.168.1.37', '10.0.0.1', '172.16.0.1', '172.31.255.254'])
    assert.ok(isPrivateIPv4(ip), ip)
  for (const ip of [
    '8.8.8.8',
    '172.32.0.1',
    '169.254.1.1',
    '127.0.0.1',
    '192.168.1.256',
    '',
    'fe80::1',
  ])
    assert.ok(!isPrivateIPv4(ip), ip)
})

test('файл от kladez-net.ps1: адреса, порт, Wi-Fi первым, BOM не мешает', () => {
  const text =
    String.fromCharCode(0xfeff) +
    JSON.stringify({
      adminPort: 8080,
      updatedAt: '2026-11-07T10:00:00Z',
      addresses: [
        { ip: '192.168.0.105', kind: 'ethernet', name: 'Ethernet' },
        { ip: '192.168.1.37', kind: 'wifi', name: 'Беспроводная сеть' },
        { ip: '8.8.8.8', kind: 'wifi', name: 'x' },
        { ip: '192.168.1.37', kind: 'wifi', name: 'дубль' },
        { ip: 42, kind: 'wifi', name: 'мусор' },
      ],
    })
  const r = parseHostNetworkFile(text)
  assert.equal(r.adminPort, 8080)
  assert.deepEqual(
    r.addresses.map((a) => [a.ip, a.kind]),
    [
      ['192.168.1.37', 'wifi'],
      ['192.168.0.105', 'ethernet'],
    ]
  )
})

test('испорченный файл — пустой список', () => {
  assert.deepEqual(parseHostNetworkFile('not json'), { addresses: [], adminPort: null })
  assert.deepEqual(parseHostNetworkFile('{"addresses": 5, "adminPort": "abc"}'), {
    addresses: [],
    adminPort: null,
  })
})

test('без файла: адаптеры процесса без WSL, Docker, VPN и внутренних', () => {
  const r = addressesFromInterfaces({
    'vEthernet (WSL)': [{ address: '172.27.160.1', family: 'IPv4', internal: false } as any],
    'docker0': [{ address: '172.17.0.1', family: 'IPv4', internal: false } as any],
    'Беспроводная сеть': [
      { address: 'fe80::1', family: 'IPv6', internal: false } as any,
      { address: '192.168.1.37', family: 'IPv4', internal: false } as any,
    ],
    'wg0': [{ address: '10.8.0.2', family: 'IPv4', internal: false } as any],
    'lo': [{ address: '127.0.0.1', family: 'IPv4', internal: true } as any],
    'eth0': [{ address: '192.168.0.10', family: 'IPv4', internal: false } as any],
  })
  assert.deepEqual(
    r.map((a) => [a.ip, a.kind]),
    [
      ['192.168.1.37', 'wifi'],
      ['192.168.0.10', 'ethernet'],
    ]
  )
})

test('pickLanAddresses убирает VPN по названию', () => {
  assert.deepEqual(pickLanAddresses([{ ip: '10.8.0.2', kind: 'other', name: 'OpenVPN TAP' }]), [])
})

test('порт панели из URL окружения', () => {
  assert.equal(adminPortFromEnv({ URL: 'http://localhost:8081' }), 8081)
  assert.equal(adminPortFromEnv({}), 8080)
  assert.equal(adminPortFromEnv({ URL: 'не адрес' }), 8080)
})

test('адрес для телефона', () => {
  assert.equal(phoneUrl('192.168.1.37', 8080), 'http://192.168.1.37:8080')
  assert.equal(phoneUrl('192.168.1.37', 80), 'http://192.168.1.37')
})

test('QR-код считается локально и детерминированно', () => {
  const a = qrPath('http://192.168.1.37:8080')
  assert.equal(a.size, 25) // версия 2 при уровне M для 24 символов
  assert.match(a.path, /^(M\d+ \d+h1v1h-1z)+$/)
  assert.deepEqual(qrPath('http://192.168.1.37:8080'), a)
  assert.notEqual(qrPath('http://192.168.1.38:8080').path, a.path)
})
