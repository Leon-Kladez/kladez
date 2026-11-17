import JSZip from 'jszip'
import { XMLParser } from 'fast-xml-parser'

/**
 * Turns an Excel workbook (.xlsx) into plain text the knowledge base can embed.
 * Each sheet becomes «Лист: <name>» followed by one line per row, cells joined
 * with « | ». No extra dependencies: .xlsx is a ZIP of XML files.
 */

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseTagValue: false,
  trimValues: false,
  // Entities are decoded by decodeXml below: the parser's own decoder skips
  // numeric references (&#1051;) and has size limits that big sheets can hit.
  processEntities: false,
  isArray: (name) => ['si', 'r', 'row', 'c', 'sheet', 'Relationship', 'xf', 'numFmt'].includes(name),
})

const NAMED: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" }

export function decodeXml(s: string): string {
  if (!s.includes('&')) return s
  return s.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (whole, ref: string) => {
    if (ref[0] !== '#') return NAMED[ref.toLowerCase()] ?? whole
    const code = ref[1] === 'x' || ref[1] === 'X' ? Number.parseInt(ref.slice(2), 16) : Number(ref.slice(1))
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : whole
  })
}

function textOf(node: unknown): string {
  if (node === undefined || node === null) return ''
  if (typeof node === 'string' || typeof node === 'number') return decodeXml(String(node))
  if (Array.isArray(node)) return node.map(textOf).join('')
  if (typeof node === 'object') {
    const obj = node as Record<string, unknown>
    if ('#text' in obj) return textOf(obj['#text'])
    // rich text: <r><t>..</t></r>; skip phonetic hints (<rPh>)
    if (obj.r) return textOf((obj.r as unknown[]).map((run) => (run as Record<string, unknown>)?.t))
    if ('t' in obj) return textOf(obj.t)
  }
  return ''
}

/** "C12" → 2 (zero-based column index) */
export function columnIndex(ref: string): number {
  const letters = /^[A-Z]+/i.exec(ref)?.[0]?.toUpperCase() ?? ''
  let n = 0
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64)
  return Math.max(0, n - 1)
}

/** Built-in Excel number formats that are dates or times. */
const BUILTIN_DATE_FORMATS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 45, 46, 47])

/** A custom format code shows a date/time if it has d, m, y, h or s outside quotes and [colour] blocks. */
export function isDateFormat(code: string): boolean {
  const bare = code.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '').replace(/\\./g, '')
  return /[dmyhs]/i.test(bare) && !/^[#0.,%\s]*$/.test(bare)
}

/** Excel serial date → «31.12.2024» (and « 14:30» when there is a time part). */
export function excelSerialToDate(serial: number): string {
  const ms = Math.round((serial - 25569) * 86400000)
  const d = new Date(ms)
  const pad = (n: number) => String(n).padStart(2, '0')
  const date = `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`
  if (serial < 1) return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
  const hasTime = d.getUTCHours() !== 0 || d.getUTCMinutes() !== 0
  return hasTime ? `${date} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` : date
}

function cellText(c: Record<string, unknown>, shared: string[], dateStyles: Set<number>): string {
  const type = c['@_t']
  if (type === 'inlineStr') return textOf(c.is)
  const v = textOf(c.v)
  if (type === 's') return shared[Number(v)] ?? ''
  if (type === 'b') return v === '1' ? 'ИСТИНА' : 'ЛОЖЬ'
  if ((type === undefined || type === 'n') && v !== '' && dateStyles.has(Number(c['@_s']))) {
    const serial = Number(v)
    if (Number.isFinite(serial) && serial >= 0) return excelSerialToDate(serial)
  }
  return v
}

export async function xlsxToText(buffer: Buffer): Promise<string> {
  const zip = await JSZip.loadAsync(buffer)
  const read = async (path: string) => {
    const xml = await zip.file(path)?.async('text')
    return xml ? parser.parse(xml) : null
  }

  const sst = await read('xl/sharedStrings.xml')
  const shared: string[] = (sst?.sst?.si ?? []).map((si: unknown) => textOf(si))

  const styles = await read('xl/styles.xml')
  const customFormats = new Map<number, string>()
  for (const f of styles?.styleSheet?.numFmts?.numFmt ?? []) {
    customFormats.set(Number(f['@_numFmtId']), decodeXml(String(f['@_formatCode'] ?? '')))
  }
  const dateStyles = new Set<number>()
  ;(styles?.styleSheet?.cellXfs?.xf ?? []).forEach((xf: Record<string, string>, i: number) => {
    const id = Number(xf['@_numFmtId'] ?? 0)
    const custom = customFormats.get(id)
    if (BUILTIN_DATE_FORMATS.has(id) || (custom !== undefined && isDateFormat(custom))) dateStyles.add(i)
  })

  const wb = await read('xl/workbook.xml')
  const rels = await read('xl/_rels/workbook.xml.rels')
  const targets = new Map<string, string>()
  for (const rel of rels?.Relationships?.Relationship ?? []) {
    const target = String(rel['@_Target'] ?? '').replace(/^\/?xl\//, '').replace(/^\//, '')
    targets.set(rel['@_Id'], `xl/${target}`)
  }

  let sheets: { name: string; path: string }[] = (wb?.workbook?.sheets?.sheet ?? []).map(
    (s: Record<string, string>, i: number) => ({
      name: decodeXml(s['@_name'] ?? `${i + 1}`),
      path: targets.get(s['@_r:id']) ?? `xl/worksheets/sheet${i + 1}.xml`,
    })
  )
  if (sheets.length === 0) {
    sheets = Object.keys(zip.files)
      .filter((p) => /^xl\/worksheets\/sheet\d+\.xml$/.test(p))
      .sort()
      .map((path, i) => ({ name: `${i + 1}`, path }))
  }

  const parts: string[] = []
  for (const sheet of sheets) {
    const ws = await read(sheet.path)
    const rows: Record<string, unknown>[] = ws?.worksheet?.sheetData?.row ?? []
    const lines: string[] = []
    for (const row of rows) {
      const cells: string[] = []
      for (const c of (row.c as Record<string, unknown>[]) ?? []) {
        const ref = c['@_r']
        const idx = typeof ref === 'string' ? columnIndex(ref) : cells.length
        while (cells.length < idx) cells.push('')
        cells[idx] = cellText(c, shared, dateStyles).replace(/\s+/g, ' ').trim()
      }
      while (cells.length && !cells[cells.length - 1]) cells.pop()
      if (cells.length) lines.push(cells.join(' | '))
    }
    if (lines.length) parts.push(`Лист: ${sheet.name}\n${lines.join('\n')}`)
  }
  return parts.join('\n\n')
}
