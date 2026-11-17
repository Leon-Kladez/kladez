import JSZip from 'jszip'

/**
 * Saves an assistant answer (Markdown) as Word, Excel or a printable page
 * (→ «Сохранить как PDF»). Everything is built in the browser, offline:
 * .docx and .xlsx are ZIP archives of XML, assembled with JSZip.
 */

export interface Run {
  text: string
  bold?: boolean
  italic?: boolean
  code?: boolean
}

export type Block =
  | { type: 'heading'; level: number; runs: Run[] }
  | { type: 'paragraph'; runs: Run[] }
  | { type: 'list'; ordered: boolean; items: { level: number; marker: string; runs: Run[] }[] }
  | { type: 'table'; rows: Run[][][] }
  | { type: 'code'; lines: string[] }
  | { type: 'quote'; runs: Run[] }
  | { type: 'rule' }

// ---------------------------------------------------------------- Markdown

const INLINE = /(\*\*[^*]+?\*\*|__[^_]+?__|`[^`]+`|\*[^*\s][^*]*?\*|\[[^\]]+\]\([^)\s]+\))/g

export function parseInline(text: string): Run[] {
  const runs: Run[] = []
  let last = 0
  const push = (run: Run) => {
    if (!run.text) return
    const prev = runs[runs.length - 1]
    if (prev && !!prev.bold === !!run.bold && !!prev.italic === !!run.italic && !!prev.code === !!run.code) {
      prev.text += run.text
    } else runs.push(run)
  }
  for (const m of text.matchAll(INLINE)) {
    push({ text: text.slice(last, m.index) })
    const tok = m[0]
    if (tok.startsWith('**') || tok.startsWith('__')) {
      for (const inner of parseInline(tok.slice(2, -2))) push({ ...inner, bold: true })
    } else if (tok.startsWith('`')) {
      push({ text: tok.slice(1, -1), code: true })
    } else if (tok.startsWith('[')) {
      const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok)!
      push({ text: link[1] === link[2] ? link[1] : `${link[1]} (${link[2]})` })
    } else {
      for (const inner of parseInline(tok.slice(1, -1))) push({ ...inner, italic: true })
    }
    last = m.index! + tok.length
  }
  push({ text: text.slice(last) })
  return runs
}

export function plainText(runs: Run[]): string {
  return runs.map((r) => r.text).join('')
}

function splitRow(line: string): string[] {
  let s = line.trim()
  if (s.startsWith('|')) s = s.slice(1)
  if (s.endsWith('|') && !s.endsWith('\\|')) s = s.slice(0, -1)
  return s.split(/(?<!\\)\|/).map((c) => c.replace(/\\\|/g, '|').trim())
}

const TABLE_SEPARATOR = /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/
const LIST_ITEM = /^(\s*)([-*+•]|\d{1,3}[.)])\s+(.*)$/
const HEADING = /^\s{0,3}(#{1,6})\s+(.*?)\s*#*\s*$/
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/

export function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ type: 'paragraph', runs: parseInline(para.join(' ')) })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line.trim()) {
      flush()
      continue
    }
    const fence = /^\s*(```|~~~)/.exec(line)
    if (fence) {
      flush()
      const code: string[] = []
      for (i++; i < lines.length && !lines[i].trim().startsWith(fence[1]); i++) code.push(lines[i])
      blocks.push({ type: 'code', lines: code })
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flush()
      blocks.push({ type: 'heading', level: heading[1].length, runs: parseInline(heading[2]) })
      continue
    }
    if (line.includes('|') && i + 1 < lines.length && TABLE_SEPARATOR.test(lines[i + 1])) {
      flush()
      const rows: Run[][][] = [splitRow(line).map(parseInline)]
      for (i += 2; i < lines.length && lines[i].includes('|') && lines[i].trim(); i++) {
        rows.push(splitRow(lines[i]).map(parseInline))
      }
      i--
      const width = Math.max(...rows.map((r) => r.length))
      for (const r of rows) while (r.length < width) r.push([])
      blocks.push({ type: 'table', rows })
      continue
    }
    if (RULE.test(line)) {
      flush()
      blocks.push({ type: 'rule' })
      continue
    }
    const item = LIST_ITEM.exec(line)
    if (item) {
      flush()
      const ordered = /\d/.test(item[2])
      const prev = blocks[blocks.length - 1]
      const list =
        prev && prev.type === 'list' && (prev.ordered === ordered || item[1].length > 0)
          ? prev
          : (blocks[blocks.push({ type: 'list', ordered, items: [] }) - 1] as Extract<Block, { type: 'list' }>)
      const level = Math.min(3, Math.floor(item[1].replace(/\t/g, '    ').length / 2))
      const marker = ordered ? `${Number.parseInt(item[2], 10)}.` : level % 2 ? '◦' : '•'
      list.items.push({ level, marker, runs: parseInline(item[3]) })
      continue
    }
    if (/^\s*>/.test(line)) {
      flush()
      const quote: string[] = []
      for (; i < lines.length && /^\s*>/.test(lines[i]); i++) quote.push(lines[i].replace(/^\s*>\s?/, ''))
      i--
      blocks.push({ type: 'quote', runs: parseInline(quote.join(' ')) })
      continue
    }
    // a wrapped line that continues the previous list item
    const prev = blocks[blocks.length - 1]
    if (!para.length && prev?.type === 'list' && /^\s{2,}\S/.test(line) && lines[i - 1]?.trim()) {
      const last = prev.items[prev.items.length - 1]
      last.runs.push(...parseInline(' ' + line.trim()))
      continue
    }
    para.push(line.trim())
  }
  flush()
  return blocks
}

export function hasTable(markdown: string): boolean {
  return parseMarkdown(markdown).some((b) => b.type === 'table')
}

/** File name from the first heading or the first words, safe for Windows. */
export function exportFileName(markdown: string, fallback: string): string {
  const blocks = parseMarkdown(markdown)
  const first = blocks.find((b) => b.type === 'heading') ?? blocks.find((b) => b.type === 'paragraph')
  let name = first && 'runs' in first ? plainText(first.runs) : ''
  name = name.replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim()
  if (name.length > 60) name = name.slice(0, 60).replace(/\s+\S*$/, '').trim()
  name = name.replace(/[.\s]+$/, '')
  return name || fallback
}

// ---------------------------------------------------------------- XML helpers

export function xml(text: string): string {
  return text
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const XML_HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'

// ---------------------------------------------------------------- Word

const W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'

function wRuns(runs: Run[], extra = ''): string {
  return runs
    .map((r) => {
      const props =
        extra +
        (r.bold ? '<w:b/>' : '') +
        (r.italic ? '<w:i/>' : '') +
        (r.code ? '<w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/>' : '')
      return `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}<w:t xml:space="preserve">${xml(r.text)}</w:t></w:r>`
    })
    .join('')
}

function wPara(runs: Run[], pPr = '', rPr = ''): string {
  return `<w:p>${pPr ? `<w:pPr>${pPr}</w:pPr>` : ''}${wRuns(runs, rPr)}</w:p>`
}

function wTable(rows: Run[][][]): string {
  const cols = rows[0]?.length ?? 0
  const border = (side: string) => `<w:${side} w:val="single" w:sz="4" w:space="0" w:color="A6A6A6"/>`
  const grid = Array.from({ length: cols }, () => `<w:gridCol w:w="${Math.floor(9000 / Math.max(1, cols))}"/>`).join('')
  const body = rows
    .map((row, r) => {
      const cells = row
        .map((cell) => {
          const shade = r === 0 ? '<w:tcPr><w:shd w:val="clear" w:color="auto" w:fill="E8EEF4"/></w:tcPr>' : ''
          return `<w:tc>${shade}${wPara(cell, '<w:spacing w:before="40" w:after="40"/>', r === 0 ? '<w:b/>' : '')}</w:tc>`
        })
        .join('')
      return `<w:tr>${r === 0 ? '<w:trPr><w:tblHeader/></w:trPr>' : ''}${cells}</w:tr>`
    })
    .join('')
  return (
    `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/><w:tblBorders>` +
    ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(border).join('') +
    `</w:tblBorders><w:tblCellMar><w:left w:w="100" w:type="dxa"/><w:right w:w="100" w:type="dxa"/></w:tblCellMar></w:tblPr>` +
    `<w:tblGrid>${grid}</w:tblGrid>${body}</w:tbl>`
  )
}

function wBody(blocks: Block[]): string {
  const out: string[] = []
  for (const b of blocks) {
    switch (b.type) {
      case 'heading':
        out.push(wPara(b.runs, `<w:pStyle w:val="Heading${Math.min(3, b.level)}"/>`))
        break
      case 'paragraph':
        out.push(wPara(b.runs))
        break
      case 'list':
        for (const it of b.items) {
          const left = 360 + it.level * 360
          out.push(
            wPara(
              [{ text: `${it.marker}\t` }, ...it.runs],
              `<w:tabs><w:tab w:val="left" w:pos="${left}"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="${left}" w:hanging="360"/>`
            )
          )
        }
        break
      case 'table':
        out.push(wTable(b.rows), wPara([]))
        break
      case 'code':
        for (const line of b.lines.length ? b.lines : ['']) out.push(wPara([{ text: line }], '<w:pStyle w:val="Code"/>'))
        break
      case 'quote':
        out.push(wPara(b.runs, '<w:pStyle w:val="Quote"/>'))
        break
      case 'rule':
        out.push(wPara([], '<w:pBdr><w:bottom w:val="single" w:sz="6" w:space="1" w:color="A6A6A6"/></w:pBdr>'))
        break
    }
  }
  return out.join('')
}

const WORD_STYLES =
  XML_HEAD +
  `<w:styles xmlns:w="${W}">` +
  `<w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:eastAsia="Calibri" w:cs="Calibri"/><w:sz w:val="24"/><w:szCs w:val="24"/><w:lang w:val="ru-RU"/></w:rPr></w:rPrDefault>` +
  `<w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>` +
  `<w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:qFormat/></w:style>` +
  [
    [1, 36, 240],
    [2, 30, 200],
    [3, 26, 160],
  ]
    .map(
      ([n, size, before]) =>
        `<w:style w:type="paragraph" w:styleId="Heading${n}"><w:name w:val="heading ${n}"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:qFormat/>` +
        `<w:pPr><w:keepNext/><w:spacing w:before="${before}" w:after="120"/><w:outlineLvl w:val="${n - 1}"/></w:pPr>` +
        `<w:rPr><w:b/><w:color w:val="1F3864"/><w:sz w:val="${size}"/><w:szCs w:val="${size}"/></w:rPr></w:style>`
    )
    .join('') +
  `<w:style w:type="paragraph" w:styleId="Code"><w:name w:val="Code"/><w:basedOn w:val="Normal"/><w:pPr><w:shd w:val="clear" w:color="auto" w:fill="F2F2F2"/><w:spacing w:after="0" w:line="240" w:lineRule="auto"/></w:pPr><w:rPr><w:rFonts w:ascii="Consolas" w:hAnsi="Consolas" w:cs="Consolas"/><w:sz w:val="20"/></w:rPr></w:style>` +
  `<w:style w:type="paragraph" w:styleId="Quote"><w:name w:val="Quote"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="567"/><w:pBdr><w:left w:val="single" w:sz="12" w:space="8" w:color="A6A6A6"/></w:pBdr></w:pPr><w:rPr><w:i/><w:color w:val="404040"/></w:rPr></w:style>` +
  `</w:styles>`

export function buildDocx(markdown: string): JSZip {
  const zip = new JSZip()
  zip.file(
    '[Content_Types].xml',
    XML_HEAD +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>` +
      `<Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>`
  )
  zip.file(
    '_rels/.rels',
    XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`
  )
  zip.file(
    'word/_rels/document.xml.rels',
    XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  )
  zip.file('word/styles.xml', WORD_STYLES)
  zip.file(
    'word/document.xml',
    XML_HEAD +
      `<w:document xmlns:w="${W}"><w:body>${wBody(parseMarkdown(markdown))}` +
      `<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1418" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>`
  )
  return zip
}

// ---------------------------------------------------------------- Excel

/** "1 234,5" → 1234.5; leaves codes like "007" or long ids as text. */
export function cellNumber(text: string): number | null {
  const s = text.replace(/[\s  ]/g, '')
  if (!/^[-−]?\d+([.,]\d+)?$/.test(s)) return null
  if (/^[-−]?0\d/.test(s) || s.replace(/\D/g, '').length > 15) return null
  const n = Number(s.replace('−', '-').replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function colName(i: number): string {
  let s = ''
  for (let n = i + 1; n > 0; n = Math.floor((n - 1) / 26)) s = String.fromCharCode(65 + ((n - 1) % 26)) + s
  return s
}

function sheetXml(rows: string[][]): string {
  const widths = rows[0].map((_, c) => Math.min(60, Math.max(8, ...rows.map((r) => (r[c] ?? '').length + 2))))
  const cols = widths.map((w, c) => `<col min="${c + 1}" max="${c + 1}" width="${w}" customWidth="1"/>`).join('')
  const data = rows
    .map((row, r) => {
      const cells = row
        .map((text, c) => {
          const ref = `${colName(c)}${r + 1}`
          const num = r === 0 ? null : cellNumber(text)
          if (num !== null) return `<c r="${ref}"><v>${num}</v></c>`
          if (!text) return ''
          return `<c r="${ref}" t="inlineStr"${r === 0 ? ' s="1"' : ''}><is><t xml:space="preserve">${xml(text)}</t></is></c>`
        })
        .join('')
      return `<row r="${r + 1}">${cells}</row>`
    })
    .join('')
  return (
    XML_HEAD +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>` +
    `<cols>${cols}</cols><sheetData>${data}</sheetData></worksheet>`
  )
}

const XLSX_STYLES =
  XML_HEAD +
  `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
  `<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>` +
  `<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE8EEF4"/><bgColor indexed="64"/></patternFill></fill></fills>` +
  `<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>` +
  `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
  `<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/></cellXfs>` +
  `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`

/** One sheet per table in the answer; null when the answer has no table. */
export function buildXlsx(markdown: string, sheetName: (n: number) => string): JSZip | null {
  const tables = parseMarkdown(markdown).filter((b): b is Extract<Block, { type: 'table' }> => b.type === 'table')
  if (!tables.length) return null
  const zip = new JSZip()
  const names = tables.map((_, i) => xml(sheetName(i + 1).replace(/[[\]:*?/\\]/g, ' ').slice(0, 31)))
  zip.file(
    '[Content_Types].xml',
    XML_HEAD +
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
      `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>` +
      `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
      `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
      tables
        .map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`)
        .join('') +
      `</Types>`
  )
  zip.file(
    '_rels/.rels',
    XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`
  )
  zip.file(
    'xl/_rels/workbook.xml.rels',
    XML_HEAD +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      tables
        .map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`)
        .join('') +
      `<Relationship Id="rId${tables.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`
  )
  zip.file(
    'xl/workbook.xml',
    XML_HEAD +
      `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>` +
      names.map((n, i) => `<sheet name="${n}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') +
      `</sheets></workbook>`
  )
  zip.file('xl/styles.xml', XLSX_STYLES)
  tables.forEach((t, i) => zip.file(`xl/worksheets/sheet${i + 1}.xml`, sheetXml(t.rows.map((r) => r.map(plainText)))))
  return zip
}

// ---------------------------------------------------------------- printable page (→ PDF)

function hRuns(runs: Run[]): string {
  return runs
    .map((r) => {
      let s = xml(r.text)
      if (r.code) s = `<code>${s}</code>`
      if (r.italic) s = `<em>${s}</em>`
      if (r.bold) s = `<strong>${s}</strong>`
      return s
    })
    .join('')
}

export function buildPrintHtml(markdown: string, title: string, lang: string): string {
  const body = parseMarkdown(markdown)
    .map((b) => {
      switch (b.type) {
        case 'heading':
          return `<h${Math.min(3, b.level)}>${hRuns(b.runs)}</h${Math.min(3, b.level)}>`
        case 'paragraph':
          return `<p>${hRuns(b.runs)}</p>`
        case 'list':
          return `<div class="list">${b.items
            .map((it) => `<div class="li" style="margin-left:${1.4 + it.level * 1.4}em"><span class="m">${xml(it.marker)}</span>${hRuns(it.runs)}</div>`)
            .join('')}</div>`
        case 'table':
          return `<table>${b.rows
            .map((row, r) => `<tr>${row.map((c) => (r === 0 ? `<th>${hRuns(c)}</th>` : `<td>${hRuns(c)}</td>`)).join('')}</tr>`)
            .join('')}</table>`
        case 'code':
          return `<pre>${xml(b.lines.join('\n'))}</pre>`
        case 'quote':
          return `<blockquote>${hRuns(b.runs)}</blockquote>`
        case 'rule':
          return '<hr>'
      }
    })
    .join('\n')
  return (
    `<!doctype html><html lang="${xml(lang)}"><head><meta charset="utf-8"><title>${xml(title)}</title><style>` +
    `@page{size:A4;margin:18mm 16mm}body{font:12pt/1.45 Calibri,Arial,sans-serif;color:#111;margin:0}` +
    `h1{font-size:20pt;color:#1f3864;margin:0 0 8pt}h2{font-size:16pt;color:#1f3864;margin:14pt 0 6pt}h3{font-size:13pt;color:#1f3864;margin:12pt 0 6pt}` +
    `p{margin:0 0 7pt}.li{margin-bottom:3pt;text-indent:-1.2em}.li .m{display:inline-block;width:1.2em;text-indent:0}.list{margin:0 0 7pt}` +
    `table{border-collapse:collapse;width:100%;margin:4pt 0 10pt;page-break-inside:auto}tr{page-break-inside:avoid}` +
    `th,td{border:1px solid #a6a6a6;padding:3pt 6pt;text-align:left;vertical-align:top}th{background:#e8eef4}thead{display:table-header-group}` +
    `pre{background:#f2f2f2;padding:6pt;white-space:pre-wrap;font:10pt Consolas,monospace}code{background:#f2f2f2;font-family:Consolas,monospace}` +
    `blockquote{margin:0 0 7pt;padding-left:10pt;border-left:3px solid #a6a6a6;color:#404040;font-style:italic}hr{border:0;border-top:1px solid #a6a6a6}` +
    `</style></head><body>${body}</body></html>`
  )
}
