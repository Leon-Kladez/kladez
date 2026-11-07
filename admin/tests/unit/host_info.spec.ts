import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { parseHostInfo } from '../../app/utils/host_info.js'

test('память и диски компьютера из файла kladez-net.ps1', () => {
  const info = parseHostInfo(
    '﻿' +
      JSON.stringify({
        adminPort: 8080,
        addresses: [],
        memoryBytes: 34359738368,
        disks: [
          { name: 'c:', sizeBytes: 500, freeBytes: 100 },
          { name: 'D:', sizeBytes: 1000, freeBytes: 600 },
          { name: 'bad', sizeBytes: 1, freeBytes: 0 },
          { name: 'E:', sizeBytes: 0, freeBytes: 0 },
        ],
      })
  )
  assert.equal(info.memoryBytes, 34359738368)
  assert.deepEqual(info.disks, [
    { name: 'C:', sizeBytes: 500, freeBytes: 100 },
    { name: 'D:', sizeBytes: 1000, freeBytes: 600 },
  ])
})

test('старый файл без памяти и испорченный файл — пусто', () => {
  assert.deepEqual(parseHostInfo('{"adminPort":8080,"addresses":[]}'), { memoryBytes: null, disks: [] })
  assert.deepEqual(parseHostInfo('{oops'), { memoryBytes: null, disks: [] })
})
