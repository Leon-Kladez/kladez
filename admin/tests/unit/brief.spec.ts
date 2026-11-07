import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { BRIEF_FILES, briefSources } from '../../app/utils/brief.js'
import {
  BRIEF_SEEN_KEY,
  briefSeen,
  chooseBriefSrc,
  hasBrief,
  markBriefSeen,
  shouldAutoOpenBrief,
} from '../../inertia/lib/brief.js'

const both = { wide: '/brief/kladez-brief-16x9.mp4', tall: '/brief/kladez-brief-9x16.mp4' }

test('нет файлов — нет ролика (ни кнопки, ни окна)', () => {
  const none = briefSources(() => false)
  assert.deepEqual(none, { wide: null, tall: null })
  assert.equal(hasBrief(none), false)
  assert.equal(shouldAutoOpenBrief(none, false, '/home'), false)
  assert.deepEqual(briefSources((f) => f === BRIEF_FILES.wide), { wide: both.wide, tall: null })
})

test('компьютер — 16:9, телефон (портрет или узкий экран) — 9:16; нет нужного — другой', () => {
  assert.equal(chooseBriefSrc(both, { width: 1440, height: 900 }), both.wide)
  assert.equal(chooseBriefSrc(both, { width: 390, height: 844 }), both.tall)
  assert.equal(chooseBriefSrc(both, { width: 600, height: 400 }), both.tall, 'узкий экран «лёжа» — тоже телефон')
  assert.equal(chooseBriefSrc({ wide: both.wide, tall: null }, { width: 390, height: 844 }), both.wide)
  assert.equal(chooseBriefSrc({ wide: null, tall: both.tall }, { width: 1440, height: 900 }), both.tall)
})

test('первый вход: сам открывается только на главной и только один раз', () => {
  assert.equal(shouldAutoOpenBrief(both, false, '/home'), true)
  assert.equal(shouldAutoOpenBrief(both, true, '/home'), false)
  assert.equal(shouldAutoOpenBrief(both, false, '/library'), false)
})

test('запоминание в браузере: работает и не падает без хранилища', () => {
  const store = new Map<string, string>()
  const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) }
  assert.equal(briefSeen(storage), false)
  markBriefSeen(storage)
  assert.equal(store.get(BRIEF_SEEN_KEY), '1')
  assert.equal(briefSeen(storage), true)
  const broken = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
  assert.equal(briefSeen(broken), false)
  assert.doesNotThrow(() => markBriefSeen(broken))
  assert.equal(briefSeen(null), false)
})

test('папка public/brief с README на месте, файлы называются как в коде', () => {
  const dir = join(import.meta.dirname, '..', '..', 'public', 'brief')
  assert.ok(existsSync(join(dir, 'README.md')))
  const readme = readFileSync(join(dir, 'README.md'), 'utf8')
  assert.ok(readme.includes(BRIEF_FILES.wide) && readme.includes(BRIEF_FILES.tall))
})
