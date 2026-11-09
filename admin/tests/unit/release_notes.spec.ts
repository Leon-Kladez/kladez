import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import Markdoc from '@markdoc/markdoc'

// «Что нового»: дни — теги {% release date="…" versions="…" %}, новое сверху.
// Тот же тег, что в DocsService (app/services/docs_service.ts).
const config = {
  tags: {
    release: {
      render: 'Release',
      attributes: { date: { type: String, required: true }, versions: { type: String } },
    },
  },
}

function releases(lang: string) {
  const src = readFileSync(new URL(`../../docs/${lang}/release-notes.md`, import.meta.url), 'utf8')
  const ast = Markdoc.parse(src)
  const errors = Markdoc.validate(ast, config).filter((e) => e.error.level !== 'debug')
  const found: { date: string; versions: string[] }[] = []
  for (const node of ast.walk()) {
    if (node.type === 'tag' && node.tag === 'release') {
      found.push({
        date: String(node.attributes.date),
        versions: String(node.attributes.versions ?? '')
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
      })
    }
  }
  return { errors, found }
}

const num = (v: string) => v.split('.').map(Number).reduce((a, n) => a * 1000 + n, 0)

for (const lang of ['ru', 'en']) {
  test(`«Что нового» (${lang}): разбирается без ошибок, новое сверху`, () => {
    const { errors, found } = releases(lang)
    assert.deepEqual(errors, [])
    assert.ok(found.length >= 2)
    const newest = found.map((r) => Math.max(...r.versions.map(num)))
    for (let i = 1; i < newest.length; i++) assert.ok(newest[i - 1] > newest[i], `порядок: ${found[i].date}`)
  })
}

test('ru и en перечисляют одни и те же версии', () => {
  const ru = releases('ru').found.flatMap((r) => r.versions)
  const en = releases('en').found.flatMap((r) => r.versions)
  assert.deepEqual(en, ru)
})
