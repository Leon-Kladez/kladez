import * as assert from 'node:assert/strict'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'
import { test } from 'node:test'

import { findUntranslated } from '../../scripts/find_untranslated.js'

const ADMIN = join(import.meta.dirname, '..', '..')

function withTempDir(files: Record<string, string>, fn: (dir: string) => void) {
  const dir = mkdtempSync(join(tmpdir(), 'kladez-untranslated-'))
  try {
    for (const [name, body] of Object.entries(files)) writeFileSync(join(dir, name), body)
    fn(dir)
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

test('находит зашитый английский текст в JSX', () => {
  withTempDir(
    { 'page.tsx': `export default () => <div>\n<p>Back to Home</p>\n<p>{t('x')}</p>\n</div>` },
    (dir) => {
      const found = findUntranslated(dir)
      assert.equal(found.length, 1)
      assert.equal(found[0].text, 'Back to Home')
      assert.equal(found[0].line, 2)
    }
  )
})

test('названия программ из allowlist не считаются непереведёнными', () => {
  withTempDir({ 'page.tsx': `export default () => <p>Kiwix</p>` }, (dir) => {
    assert.deepEqual(findUntranslated(dir), [])
  })
})

test('находит английский в атрибутах и уведомлениях', () => {
  withTempDir(
    {
      'page.tsx': [
        `export default () => <input placeholder="Search apps" title={'Open settings'} aria-label="Close" />`,
        `addNotification({ type: 'error', message: 'Failed to install' })`,
        `showError('Something went wrong')`,
        `const b = <StyledButton label="Save">{'ok'}</StyledButton>`,
      ].join('\n'),
    },
    (dir) => {
      const texts = findUntranslated(dir).map((f) => f.text).sort()
      assert.deepEqual(texts, ['Close', 'Failed to install', 'Open settings', 'Save', 'Search apps', 'Something went wrong'])
    }
  )
})

test('русский текст, классы и короткие слова не считаются', () => {
  withTempDir(
    {
      'page.tsx': `export default () => <div className="flex items-center"><p>Готово</p><p>OK</p><p>{count} / {total}</p></div>`,
    },
    (dir) => assert.deepEqual(findUntranslated(dir), [])
  )
})

// Папки, уже переведённые на русский. Каждая задача перевода добавляет сюда свои.
const DONE_DIRS: string[] = []

test('нет зашитого английского в готовых папках', () => {
  const found = DONE_DIRS.flatMap((d) => findUntranslated(join(ADMIN, d)))
  assert.deepEqual(
    found.map((f) => `${relative(ADMIN, f.file)}:${f.line} ${f.text}`),
    []
  )
})
