import { test } from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'

import {
  buildDocx,
  buildPrintHtml,
  buildXlsx,
  cellNumber,
  exportFileName,
  hasTable,
  parseInline,
  parseMarkdown,
} from '../../inertia/lib/answer_export.js'

const ANSWER = `# Запасы на неделю

Нужно **воды** и *немного* еды, см. [список](https://example.org).

1. Вода
2. Крупа
   - гречка
   - рис
3. Соль

| Продукт | Кол-во | Цена, ₽ |
|---|:---:|---:|
| Вода | 21 | 1 250,50 |
| Гречка | 2 | 007 |

> Храните в сухом месте.

\`\`\`
код <без> разметки
\`\`\`
---
Готово.`

test('ответ разбирается на заголовки, списки, таблицу, цитату и код', () => {
  const blocks = parseMarkdown(ANSWER)
  assert.deepEqual(
    blocks.map((b) => b.type),
    ['heading', 'paragraph', 'list', 'table', 'quote', 'code', 'rule', 'paragraph']
  )
  const list = blocks[2] as Extract<(typeof blocks)[number], { type: 'list' }>
  assert.deepEqual(
    list.items.map((i) => `${i.level}${i.marker}`),
    ['01.', '02.', '1◦', '1◦', '03.']
  )
  const table = blocks[3] as Extract<(typeof blocks)[number], { type: 'table' }>
  assert.equal(table.rows.length, 3)
  assert.equal(table.rows[0][2][0].text, 'Цена, ₽')
})

test('жирный, курсив, код и ссылки внутри строки', () => {
  assert.deepEqual(parseInline('a **b** *c* `d` [e](http://x)'), [
    { text: 'a ' },
    { text: 'b', bold: true },
    { text: ' ' },
    { text: 'c', italic: true },
    { text: ' ' },
    { text: 'd', code: true },
    { text: ' e (http://x)' },
  ])
  assert.deepEqual(parseInline('2 * 3 * 4'), [{ text: '2 * 3 * 4' }])
})

test('кнопка Excel показывается только когда в ответе есть таблица', () => {
  assert.equal(hasTable(ANSWER), true)
  assert.equal(hasTable('Просто текст | с чертой'), false)
  assert.equal(buildXlsx('Нет таблиц', (n) => `Таблица ${n}`), null)
})

test('числа в таблице становятся числами Excel, коды — текстом', () => {
  assert.equal(cellNumber('1 250,50'), 1250.5)
  assert.equal(cellNumber('21'), 21)
  assert.equal(cellNumber('007'), null)
  assert.equal(cellNumber('12 шт'), null)
  assert.equal(cellNumber('79161234567890123'), null)
})

test('Word-файл: заголовок, жирный текст, таблица, экранирование', async () => {
  const zip = await JSZip.loadAsync(await buildDocx(ANSWER).generateAsync({ type: 'nodebuffer' }))
  const doc = await zip.file('word/document.xml')!.async('text')
  assert.match(doc, /<w:pStyle w:val="Heading1"\/><\/w:pPr><w:r><w:t xml:space="preserve">Запасы на неделю/)
  assert.match(doc, /<w:b\/><\/w:rPr><w:t xml:space="preserve">воды/)
  assert.equal((doc.match(/<w:tr>/g) ?? []).length, 3)
  assert.match(doc, /код &lt;без&gt; разметки/)
  for (const part of ['[Content_Types].xml', '_rels/.rels', 'word/_rels/document.xml.rels', 'word/styles.xml']) {
    assert.ok(zip.file(part), part)
  }
})

test('Excel-файл: лист на каждую таблицу, шапка жирная', async () => {
  const two = `${ANSWER}\n\n| A | B |\n|---|---|\n| x | 1 |`
  const zip = await JSZip.loadAsync(await buildXlsx(two, (n) => `Таблица ${n}`)!.generateAsync({ type: 'nodebuffer' }))
  const wb = await zip.file('xl/workbook.xml')!.async('text')
  assert.match(wb, /name="Таблица 1".*name="Таблица 2"/)
  const s1 = await zip.file('xl/worksheets/sheet1.xml')!.async('text')
  assert.match(s1, /<c r="A1" t="inlineStr" s="1"><is><t xml:space="preserve">Продукт/)
  assert.match(s1, /<c r="C2"><v>1250.5<\/v><\/c>/)
  assert.match(s1, /<c r="C3" t="inlineStr"><is><t xml:space="preserve">007/)
})

test('страница для печати в PDF и имя файла', () => {
  const html = buildPrintHtml(ANSWER, 'Запасы', 'ru')
  assert.match(html, /<h1>Запасы на неделю<\/h1>/)
  assert.match(html, /<th>Продукт<\/th>/)
  assert.match(html, /<strong>воды<\/strong>/)
  assert.equal(exportFileName(ANSWER, 'Ответ'), 'Запасы на неделю')
  assert.equal(exportFileName('Что: делать?/', 'Ответ'), 'Что делать')
  assert.equal(exportFileName('', 'Ответ'), 'Ответ')
})
