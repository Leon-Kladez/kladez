import * as assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'

import {
  DOC_ORDER,
  docCandidates,
  normalizeSlug,
  sortDocs,
  titleFromMarkdown,
} from '../../app/utils/docs_pages.js'
import { SUPPLY_DEPOT_DOC_ANCHORS, SUPPLY_DEPOT_DOC_PAGE } from '../../constants/supply_depot_docs.js'

const DOCS = join(import.meta.dirname, '..', '..', 'docs')
const LANGS = ['ru', 'en']

function pages(lang: string): string[] {
  return readdirSync(join(DOCS, lang))
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''))
    .sort()
}

test('адрес страницы: только буквы, цифры и дефис', () => {
  assert.equal(normalizeSlug('home'), 'home')
  assert.equal(normalizeSlug('release-notes.md'), 'release-notes')
  assert.equal(normalizeSlug('../secret'), null)
  assert.equal(normalizeSlug('ru/home'), null)
  assert.equal(normalizeSlug('..'), null)
  assert.equal(normalizeSlug(''), null)
  assert.equal(normalizeSlug(undefined), null)
})

test('страница ищется на языке интерфейса, потом на языке по умолчанию', () => {
  assert.deepEqual(docCandidates('/d', 'en', 'ru', 'home'), [join('/d', 'en', 'home.md'), join('/d', 'ru', 'home.md')])
  assert.deepEqual(docCandidates('/d', 'ru', 'ru', 'home'), [join('/d', 'ru', 'home.md')])
})

test('заголовок — первая строка «# …»', () => {
  assert.equal(titleFromMarkdown('Текст\n# Карты\n## Ещё', 'maps'), 'Карты')
  assert.equal(titleFromMarkdown('# Программы {% #apps %}\n', 'x'), 'Программы')
  assert.equal(titleFromMarkdown('без заголовка', 'maps'), 'maps')
})

test('порядок страниц — как в DOC_ORDER, неизвестные в конце', () => {
  const sorted = sortDocs([{ slug: 'zzz' }, { slug: 'about' }, { slug: 'home' }]).map((d) => d.slug)
  assert.deepEqual(sorted, ['home', 'about', 'zzz'])
})

test('в справке на русском и английском одни и те же страницы, и все есть в меню', () => {
  const ru = pages('ru')
  assert.deepEqual(pages('en'), ru)
  for (const slug of ru) assert.ok(DOC_ORDER.includes(slug), `нет в DOC_ORDER: ${slug}`)
  for (const slug of DOC_ORDER) assert.ok(ru.includes(slug), `нет файла: ${slug}`)
})

test('каждая страница начинается с заголовка «# …»', () => {
  for (const lang of LANGS) {
    for (const slug of pages(lang)) {
      const text = readFileSync(join(DOCS, lang, `${slug}.md`), 'utf-8')
      assert.match(text, /^# \S/, `${lang}/${slug}.md`)
    }
  }
})

test('Project NOMAD упоминается только как основа (атрибуция), без чужих адресов', () => {
  for (const lang of LANGS) {
    for (const slug of pages(lang)) {
      const text = readFileSync(join(DOCS, lang, `${slug}.md`), 'utf-8')
      assert.doesNotMatch(text, /projectnomad\.us|install_nomad|Command Center|discord\.com/i, `${lang}/${slug}.md`)
      if (slug !== 'about') {
        assert.doesNotMatch(text, /NOMAD/, `${lang}/${slug}.md: имя NOMAD — только на странице about`)
      }
    }
    const about = readFileSync(join(DOCS, lang, 'about.md'), 'utf-8')
    assert.match(about, /Project NOMAD/)
    assert.match(about, /Crosstalk Solutions/)
    assert.match(about, /Apache/)
  }
})

test('у каждого приложения склада есть свой раздел в справке на обоих языках', () => {
  for (const lang of LANGS) {
    const text = readFileSync(join(DOCS, lang, `${SUPPLY_DEPOT_DOC_PAGE}.md`), 'utf-8')
    for (const anchor of new Set(Object.values(SUPPLY_DEPOT_DOC_ANCHORS))) {
      assert.ok(text.includes(`{% #${anchor} %}`), `${lang}: нет раздела #${anchor}`)
    }
  }
})
