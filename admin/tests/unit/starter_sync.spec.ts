import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { join } from 'node:path'

import { syncStarterZim, type StarterSyncDeps } from '../../app/utils/starter_sync.js'
import { PREVIOUS_STARTER_ZIMS, STARTER_ZIM } from '../../constants/kladez.js'

const ZIM = '/storage/zim'
const NEW = { filename: 'wikipedia_ru_medicine_nopic_2026-10.zim', sha256: 'new-sum' }
const OLD = { filename: 'vikidia_ru_all_nopic_2026-09.zim', sha256: 'old-sum' }
const BUNDLED = '/app/assets/kiwix/' + NEW.filename

/** Поддельные диск, библиотека и база: всё в памяти. */
function world(opts: {
  disk?: Record<string, string>
  library?: string[]
  picked?: string[]
  last?: string | null
  bundled?: boolean
}) {
  const disk = new Map(Object.entries(opts.disk ?? {}).map(([f, sum]) => [join(ZIM, f), sum]))
  if (opts.bundled !== false) disk.set(BUNDLED, NEW.sha256)
  const library = new Set(opts.library ?? [])
  const forgotten: string[] = []
  let last = opts.last ?? null
  const deps: StarterSyncDeps = {
    zimDir: ZIM,
    bundledPath: BUNDLED,
    exists: async (p) => disk.has(p),
    copy: async (from, to) => {
      disk.set(to, disk.get(from)!)
    },
    remove: async (p) => {
      disk.delete(p)
    },
    sha256: async (p) => disk.get(p)!,
    libraryFiles: async () => [...library],
    addBook: async (f) => {
      library.add(f)
    },
    removeBook: async (f) => {
      library.delete(f)
    },
    pickedByPerson: async (f) => (opts.picked ?? []).includes(f),
    forgetInstalled: async (f) => {
      forgotten.push(f)
    },
    getLastStarter: async () => last,
    setLastStarter: async (f) => {
      last = f
    },
  }
  return {
    deps,
    onDisk: (f: string) => disk.has(join(ZIM, f)),
    library,
    forgotten,
    last: () => last,
  }
}

test('обновление со старой версии: медицина появляется, Викидия уходит из папки и из xml', async () => {
  const w = world({ disk: { [OLD.filename]: OLD.sha256 }, library: [OLD.filename] })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.equal(r.copied, true)
  assert.equal(r.registered, true)
  assert.deepEqual(r.removed, [OLD.filename])
  assert.ok(w.onDisk(NEW.filename))
  assert.ok(!w.onDisk(OLD.filename))
  assert.deepEqual([...w.library], [NEW.filename])
  assert.deepEqual(w.forgotten, [OLD.filename])
  assert.equal(w.last(), NEW.filename)
})

test('второй запуск ничего не меняет', async () => {
  const w = world({ disk: { [NEW.filename]: NEW.sha256 }, library: [NEW.filename], last: NEW.filename })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.deepEqual(r, { copied: false, registered: false, removed: [] })
})

test('человек удалил стартовый файл сам — не возвращаем', async () => {
  const w = world({ last: NEW.filename })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.equal(r.skipped, 'deleted-by-person')
  assert.ok(!w.onDisk(NEW.filename))
  assert.equal(w.library.size, 0)
})

test('файл на диске, но не в библиотеке — записываем в xml, не копируем заново', async () => {
  const w = world({ disk: { [NEW.filename]: NEW.sha256 } })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.equal(r.copied, false)
  assert.equal(r.registered, true)
  assert.ok(w.library.has(NEW.filename))
})

test('Викидию выбрали в наборе — оставляем', async () => {
  const w = world({ disk: { [OLD.filename]: OLD.sha256 }, library: [OLD.filename], picked: [OLD.filename] })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.deepEqual(r.removed, [])
  assert.ok(w.onDisk(OLD.filename))
  assert.ok(w.library.has(OLD.filename))
})

test('Викидия с другим содержимым (не из старого образа) — оставляем', async () => {
  const w = world({ disk: { [OLD.filename]: 'other-sum' }, library: [OLD.filename] })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.deepEqual(r.removed, [])
  assert.ok(w.onDisk(OLD.filename))
})

test('Викидию убираем только один раз: скачанная позже остаётся', async () => {
  const w = world({ disk: { [NEW.filename]: NEW.sha256, [OLD.filename]: OLD.sha256 }, library: [NEW.filename, OLD.filename], last: NEW.filename })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.deepEqual(r.removed, [])
  assert.ok(w.onDisk(OLD.filename))
})

test('в образе нет нового файла — прежний не трогаем, библиотека не пустеет', async () => {
  const w = world({ disk: { [OLD.filename]: OLD.sha256 }, library: [OLD.filename], bundled: false })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.equal(r.skipped, 'no-bundled-file')
  assert.ok(w.onDisk(OLD.filename))
  assert.ok(w.library.has(OLD.filename))
  assert.equal(w.last(), null, 'попробуем ещё раз при следующем запуске')
})

test('файла Викидии нет, а запись в xml осталась — запись убираем', async () => {
  const w = world({ library: [OLD.filename] })
  const r = await syncStarterZim(NEW, [OLD], w.deps)
  assert.deepEqual(r.removed, [OLD.filename])
  assert.deepEqual([...w.library], [NEW.filename])
})

test('прежние стартовые файлы описаны верно и не совпадают с текущим', () => {
  assert.ok(PREVIOUS_STARTER_ZIMS.some((s) => s.filename === OLD.filename))
  for (const s of PREVIOUS_STARTER_ZIMS) {
    assert.match(s.sha256, /^[0-9a-f]{64}$/)
    assert.notEqual(s.filename, STARTER_ZIM.filename)
  }
})
