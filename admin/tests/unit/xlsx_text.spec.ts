import { test } from 'node:test'
import assert from 'node:assert/strict'
import JSZip from 'jszip'

import { columnIndex, isDateFormat, xlsxToText } from '../../app/utils/xlsx_text.js'
import { determineFileType } from '../../app/utils/fs.js'

async function workbook(): Promise<Buffer> {
  const zip = new JSZip()
  zip.file(
    'xl/workbook.xml',
    `<?xml version="1.0"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Запасы" sheetId="1" r:id="rId1"/><sheet name="Пусто" sheetId="2" r:id="rId2"/></sheets></workbook>`
  )
  zip.file(
    'xl/_rels/workbook.xml.rels',
    `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Target="worksheets/sheet1.xml" Type="x"/><Relationship Id="rId2" Target="/xl/worksheets/sheet2.xml" Type="x"/></Relationships>`
  )
  zip.file(
    'xl/sharedStrings.xml',
    `<?xml version="1.0"?><sst><si><t>Товар</t></si><si><t xml:space="preserve">Количество </t></si><si><r><t>Вода </t></r><r><t>питьевая</t></r></si></sst>`
  )
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<?xml version="1.0"?><worksheet><sheetData>` +
      `<row r="1"><c r="A1" t="s"><v>0</v></c><c r="B1" t="s"><v>1</v></c></row>` +
      `<row r="2"><c r="A2" t="s"><v>2</v></c><c r="B2"><v>12.5</v></c><c r="D2" t="inlineStr"><is><t>в подвале</t></is></c></row>` +
      `<row r="3"><c r="A3" t="b"><v>1</v></c></row>` +
      `</sheetData></worksheet>`
  )
  zip.file('xl/worksheets/sheet2.xml', `<?xml version="1.0"?><worksheet><sheetData/></worksheet>`)
  return zip.generateAsync({ type: 'nodebuffer' })
}

test('Excel превращается в текст: лист, строки, ячейки через «|», пропуски столбцов сохраняются', async () => {
  const text = await xlsxToText(await workbook())
  assert.equal(
    text,
    ['Лист: Запасы', 'Товар | Количество', 'Вода питьевая | 12.5 |  | в подвале', 'ИСТИНА'].join('\n'),
    'пустой лист не выводится'
  )
})

test('даты из Excel показываются датами, а не числами', async () => {
  const zip = new JSZip()
  zip.file('xl/workbook.xml', `<workbook><sheets><sheet name="Лист1" sheetId="1"/></sheets></workbook>`)
  zip.file(
    'xl/styles.xml',
    `<styleSheet><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy\\ hh:mm"/></numFmts>` +
      `<cellXfs count="3"><xf numFmtId="0"/><xf numFmtId="14"/><xf numFmtId="164"/></cellXfs></styleSheet>`
  )
  zip.file(
    'xl/worksheets/sheet1.xml',
    `<worksheet><sheetData><row r="1"><c r="A1"><v>45657</v></c><c r="B1" s="1"><v>45657</v></c><c r="C1" s="2"><v>45657.6041666667</v></c></row></sheetData></worksheet>`
  )
  const text = await xlsxToText(await zip.generateAsync({ type: 'nodebuffer' }))
  assert.equal(text, 'Лист: Лист1\n45657 | 31.12.2024 | 31.12.2024 14:30')
})

test('формат денег и процентов — не дата', () => {
  assert.equal(isDateFormat('#,##0.00\\ "₽"'), false)
  assert.equal(isDateFormat('0.00%'), false)
  assert.equal(isDateFormat('[Red]#,##0'), false)
  assert.equal(isDateFormat('d mmmm yyyy'), true)
})

test('номер столбца по адресу ячейки', () => {
  assert.equal(columnIndex('A1'), 0)
  assert.equal(columnIndex('D7'), 3)
  assert.equal(columnIndex('AA10'), 26)
})

test('база знаний принимает .xlsx, .csv и .tsv', () => {
  assert.equal(determineFileType('отчёт.XLSX'), 'xlsx')
  assert.equal(determineFileType('список.csv'), 'text')
  assert.equal(determineFileType('данные.tsv'), 'text')
  assert.equal(determineFileType('старый.xls'), 'unknown')
})
