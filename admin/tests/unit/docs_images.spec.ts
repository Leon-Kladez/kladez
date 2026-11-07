import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const ADMIN = join(import.meta.dirname, '..', '..')
const DOCS = join(ADMIN, 'docs')

function mdFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? mdFiles(join(dir, e.name)) : e.name.endsWith('.md') ? [join(dir, e.name)] : []
  )
}

test('картинки в справке существуют (нет битых ссылок)', () => {
  for (const file of mdFiles(DOCS)) {
    const text = readFileSync(file, 'utf8')
    for (const m of text.matchAll(/!\[[^\]]*\]\(([^)\s]+)\)/g)) {
      const src = m[1]
      if (/^https?:/.test(src)) continue
      assert.ok(src.startsWith('/'), `${file}: ${src}`)
      assert.ok(existsSync(join(ADMIN, 'public', src)), `${file}: нет файла public${src}`)
    }
  }
})

test('в «Что такое «Кладезъ»» нет старого снимка главной (плитки NOMAD)', () => {
  for (const lang of ['ru', 'en']) {
    assert.doesNotMatch(readFileSync(join(DOCS, lang, 'home.md'), 'utf8'), /kladez-home\.png/)
  }
})
