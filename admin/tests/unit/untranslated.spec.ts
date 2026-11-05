import * as assert from 'node:assert/strict'
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
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

/** Все файлы и папки внутри dir, кроме перечисленных. */
function allExcept(dir: string, ...skip: string[]): string[] {
  return readdirSync(join(ADMIN, dir))
    .filter((name) => !skip.includes(name))
    .map((name) => `${dir}/${name}`)
}

// Папки, уже переведённые на русский. Каждая задача перевода добавляет сюда свои.
const DONE_DIRS: string[] = [
  // Задача 5 — общий каркас и главная
  'inertia/layouts',
  ...allExcept('inertia/components', 'chat'),
  'inertia/pages/home.tsx',
  'inertia/pages/about.tsx',
  'inertia/pages/errors',
  'inertia/lib/navigation.ts',
  'inertia/lib/util.ts',
  'inertia/lib/benchmarkScore.ts',
  'inertia/lib/kb_job_health_display.ts',
  'inertia/lib/tx.ts',
  'inertia/lib/uppy_ru.ts',
  'inertia/hooks',
  // Задача 6 — Склад программ, Быстрая настройка, Карты, Библиотека
  'inertia/pages/supply-depot.tsx',
  'inertia/pages/easy-setup',
  'inertia/pages/maps.tsx',
  'inertia/pages/settings/zim',
  'inertia/pages/settings/maps.tsx',
  'inertia/pages/settings/apps.tsx',
  'inertia/pages/settings/creator-packs.tsx',
  // Задача 7 — остальные настройки, ИИ-помощник, справочник лекарств
  'inertia/pages/settings',
  'inertia/pages/chat.tsx',
  'inertia/components/chat',
  'inertia/pages/drug-reference',
  'inertia/pages/conditions',
  'inertia/pages/docs',
  'inertia/lib',
  // Задача 8 — сообщения сервера (app/data — медицинские материалы, переводятся в части 2)
  'app/controllers',
  'app/services',
  'app/jobs',
  'app/validators',
  'config/inertia.ts',
  'constants/link_tile_colors.ts',
]

test('нет зашитого английского в готовых папках', () => {
  const found = DONE_DIRS.flatMap((d) => findUntranslated(join(ADMIN, d)))
  assert.deepEqual(
    found.map((f) => `${relative(ADMIN, f.file)}:${f.line} ${f.text}`),
    []
  )
})
