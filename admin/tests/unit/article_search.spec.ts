import * as assert from 'node:assert/strict'
import { test } from 'node:test'

import {
  articlePath,
  kiwixSearchUrl,
  mergeArticleHits,
  parseKiwixSearchXml,
  plainSnippet,
  type ArticleHit,
} from '../../app/utils/article_search.js'
import { kiwixInternalBase, searchArticles } from '../../app/utils/article_search_run.js'
import { articleReaderUrl, bookReaderUrl } from '../../inertia/lib/reader.js'

const MED = 'wikipedia_ru_medicine_nopic_2026-10'

// Ответ kiwix-serve 3.8 на /search?...&format=xml (OpenSearch RSS), сокращённо.
const MED_XML = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:opensearch="http://a9.com/-/spec/opensearch/1.1/">
  <channel>
    <title>Search: ожог</title>
    <opensearch:totalResults>346</opensearch:totalResults>
    <item>
      <title>Термический ожог</title>
      <link>/content/${MED}/%D0%A2%D0%B5%D1%80%D0%BC%D0%B8%D1%87%D0%B5%D1%81%D0%BA%D0%B8%D0%B9_%D0%BE%D0%B6%D0%BE%D0%B3</link>
      <description>...&lt;b&gt;Ожог&lt;/b&gt; — повреждение тканей   организма...</description>
      <book><title>Медицина (Википедия)</title></book>
      <wordCount>2500</wordCount>
    </item>
    <item>
      <title>Ожог</title>
      <link>/content/${MED}/%D0%9E%D0%B6%D0%BE%D0%B3</link>
      <description>Первая помощь при &lt;b&gt;ожоге&lt;/b&gt;</description>
      <book><title>Медицина (Википедия)</title></book>
    </item>
  </channel>
</rss>`

function hit(book: string, title: string, path = title): ArticleHit {
  return { book, bookTitle: book, title, path, snippet: '' }
}

test('адрес поиска Kiwix: одна книга, полный текст, XML', () => {
  const url = new URL(kiwixSearchUrl('http://nomad_kiwix_server:8080/', MED, 'ожог'))
  assert.equal(url.pathname, '/search')
  assert.equal(url.searchParams.get('books.name'), MED)
  assert.equal(url.searchParams.get('pattern'), 'ожог')
  assert.equal(url.searchParams.get('format'), 'xml')
  assert.equal(url.searchParams.get('pageLength'), '10')
})

test('ответ Kiwix разбирается: статья, книга, путь, отрывок без разметки', () => {
  const hits = parseKiwixSearchXml(MED_XML, MED, 'запасное название')
  assert.equal(hits.length, 2)
  assert.equal(hits[0].title, 'Термический ожог')
  assert.equal(hits[0].bookTitle, 'Медицина (Википедия)')
  assert.equal(hits[0].book, MED)
  assert.equal(decodeURIComponent(hits[0].path), 'Термический_ожог')
  assert.equal(hits[0].snippet, '...Ожог — повреждение тканей организма...')
})

test('битый или пустой ответ — пустой список, без ошибок', () => {
  assert.deepEqual(parseKiwixSearchXml('<html>oops', MED, 'x'), [])
  assert.deepEqual(parseKiwixSearchXml('', MED, 'x'), [])
  assert.deepEqual(
    parseKiwixSearchXml('<rss><channel><title>Search</title></channel></rss>', MED, 'x'),
    []
  )
})

test('путь статьи — из /content/<книга>/…, с адресом сервера или без', () => {
  assert.equal(articlePath(`/content/${MED}/A/Ожог`, MED), 'A/Ожог')
  assert.equal(articlePath(`http://host:8090/content/${MED}/Ожог`, MED), 'Ожог')
  assert.equal(articlePath('/content/other_book/Ожог', MED), null)
  assert.equal(plainSnippet('a <b>b</b>&nbsp; c'), 'a b c')
})

test('общий список: сначала точное название, потом по очереди из каждой книги, без повторов', () => {
  const merged = mergeArticleHits(
    [
      [hit('med', 'Термический ожог'), hit('med', 'Ожог'), hit('med', 'Солнечный ожог')],
      [hit('vik', 'Химический ожог'), hit('vik', 'Химический ожог')],
    ],
    'ожог'
  )
  assert.deepEqual(
    merged.map((h) => `${h.book}:${h.title}`),
    ['med:Ожог', 'med:Термический ожог', 'vik:Химический ожог', 'med:Солнечный ожог']
  )
  assert.equal(mergeArticleHits([[hit('a', '1'), hit('a', '2'), hit('a', '3')]], 'x', 2).length, 2)
})

test('поиск по всем книгам: одна книга не ответила — остальные всё равно найдены', async () => {
  const asked: string[] = []
  const result = await searchArticles('  ожог ', [
    { name: MED, title: 'Медицина' },
    { name: 'broken', title: 'Сломанная' },
    { name: 'noindex', title: 'Без указателя' },
  ], {
    base: 'http://kiwix:8080',
    fetch: async (url) => {
      asked.push(new URL(url).searchParams.get('books.name')!)
      const book = new URL(url).searchParams.get('books.name')
      if (book === 'broken') throw new Error('timeout')
      if (book === 'noindex') return { ok: false, text: async () => '' }
      assert.equal(new URL(url).searchParams.get('pattern'), 'ожог')
      return { ok: true, text: async () => MED_XML }
    },
  })
  assert.deepEqual(asked.sort(), ['broken', MED, 'noindex'].sort())
  assert.equal(result.unavailable, false)
  assert.equal(result.searched, 2)
  assert.equal(result.hits[0].title, 'Ожог', 'точное совпадение первым')
  assert.equal(result.hits.length, 2)
})

test('Kiwix не отвечает совсем — «не отвечает», а не «ничего не нашлось»', async () => {
  const result = await searchArticles('ожог', [{ name: MED, title: 'М' }], {
    base: 'http://kiwix:8080',
    fetch: async () => {
      throw new Error('ECONNREFUSED')
    },
  })
  assert.equal(result.unavailable, true)
  assert.deepEqual(result.hits, [])
})

test('пустой запрос или нет книг — в Kiwix не ходим', async () => {
  let calls = 0
  const fetch = async () => {
    calls++
    return { ok: true, text: async () => MED_XML }
  }
  assert.equal((await searchArticles('   ', [{ name: MED, title: 'М' }], { fetch })).hits.length, 0)
  assert.equal((await searchArticles('ожог', [], { fetch })).hits.length, 0)
  assert.equal(calls, 0)
})

test('Kiwix изнутри Docker — по имени контейнера и порту 8080', () => {
  assert.equal(kiwixInternalBase({ NODE_ENV: 'production' }), 'http://nomad_kiwix_server:8080')
  assert.equal(kiwixInternalBase({ NODE_ENV: 'development' }), 'http://localhost:8090')
  assert.equal(kiwixInternalBase({ KIWIX_INTERNAL_URL: 'http://x:1' }), 'http://x:1')
})

test('«Читать» открывает главную страницу книги, статья — сразу статью', () => {
  assert.equal(bookReaderUrl('http://192.168.1.5:8090/', MED), `http://192.168.1.5:8090/viewer#${MED}`)
  assert.equal(
    articleReaderUrl('http://192.168.1.5:8090', MED, '%D0%9E%D0%B6%D0%BE%D0%B3'),
    `http://192.168.1.5:8090/viewer#${MED}/%D0%9E%D0%B6%D0%BE%D0%B3`
  )
})
