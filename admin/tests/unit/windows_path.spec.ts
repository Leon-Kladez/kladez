import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import { toWindowsPath } from '../../app/utils/windows_path.js'

test('библиотека на диске Windows показывается как в Проводнике', () => {
  assert.equal(toWindowsPath('/mnt/d/Kladez/library'), 'D:\\Kladez\\library')
  assert.equal(toWindowsPath('/mnt/c/Users/Ann/Кладезъ/'), 'C:\\Users\\Ann\\Кладезъ')
  assert.equal(toWindowsPath('/mnt/e'), 'E:\\')
})

test('путь не с диска Windows и пустой — как есть', () => {
  assert.equal(toWindowsPath('/opt/project-nomad/storage'), '/opt/project-nomad/storage')
  assert.equal(toWindowsPath(''), '')
})
