import { useMemo, useState } from 'react'
import { IconFileTypeDocx, IconFileTypePdf, IconFileTypeXls } from '@tabler/icons-react'
import { getLocale, t } from '../../../constants/i18n'

type Kind = 'docx' | 'xlsx' | 'pdf'

const MIME: Record<'docx' | 'xlsx', string> = {
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
}

// A table needs a "|---|" separator line; checked cheaply so the export code
// (and JSZip) only loads when the person actually clicks a button.
const TABLE_HINT = /^\s*\|?\s*:?-{2,}:?\s*\|/m

function saveBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

/** Prints through a hidden frame, so no new window opens; the print dialog offers «Сохранить как PDF». */
function printHtml(html: string) {
  const frame = document.createElement('iframe')
  frame.setAttribute('aria-hidden', 'true')
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden'
  document.body.appendChild(frame)
  const doc = frame.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  const win = frame.contentWindow!
  const cleanup = () => setTimeout(() => frame.remove(), 1000)
  win.addEventListener('afterprint', cleanup, { once: true })
  setTimeout(() => {
    win.focus()
    win.print()
    // Some browsers return from print() only after the dialog closes; others never fire afterprint.
    setTimeout(cleanup, 60_000)
  }, 150)
}

export default function AnswerExport({ content }: { content: string }) {
  const [busy, setBusy] = useState<Kind | null>(null)
  const withTable = useMemo(() => TABLE_HINT.test(content), [content])

  const run = async (kind: Kind) => {
    if (busy) return
    setBusy(kind)
    try {
      const lib = await import('~/lib/answer_export')
      const name = lib.exportFileName(content, t('chat.export.fileName'))
      if (kind === 'pdf') {
        printHtml(lib.buildPrintHtml(content, name, getLocale()))
        return
      }
      const zip = kind === 'docx' ? lib.buildDocx(content) : lib.buildXlsx(content, (n) => t('chat.export.sheet', { n }))
      if (!zip) return
      saveBlob(await zip.generateAsync({ type: 'blob', mimeType: MIME[kind] }), `${name}.${kind}`)
    } catch (err) {
      console.error('answer export failed', err)
      window.alert(t('chat.export.failed'))
    } finally {
      setBusy(null)
    }
  }

  const button = (kind: Kind, label: string, title: string, Icon: typeof IconFileTypeDocx) => (
    <button
      type="button"
      onClick={() => run(kind)}
      disabled={busy !== null}
      title={title}
      className="inline-flex items-center gap-1 rounded border border-border-default px-2 py-0.5 font-medium text-text-secondary hover:bg-surface-primary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-desert-green disabled:opacity-60"
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {busy === kind ? t('chat.export.working') : label}
    </button>
  )

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 text-xs">
      <span className="text-text-muted">{t('chat.export.label')}</span>
      {button('docx', 'Word', t('chat.export.wordTitle'), IconFileTypeDocx)}
      {withTable && button('xlsx', 'Excel', t('chat.export.excelTitle'), IconFileTypeXls)}
      {button('pdf', 'PDF', t('chat.export.pdfTitle'), IconFileTypePdf)}
    </div>
  )
}
