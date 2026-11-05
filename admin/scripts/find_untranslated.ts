// Сторож зашитого английского текста в интерфейсе «Кладезъ».
// Разбирает .tsx/.ts через TypeScript Compiler API и собирает строки, которые человек увидит на экране,
// но которые не прошли через словарь t(...).
// Запуск: node --import ts-node-maintained/register/esm scripts/find_untranslated.ts inertia/pages/settings
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'

export type Untranslated = { file: string; line: number; text: string }

const ALLOWLIST: string[] = JSON.parse(
  readFileSync(join(import.meta.dirname, 'untranslated_allowlist.json'), 'utf8')
)
const ALLOWED = new Set(ALLOWLIST)
// Названия программ убираются из текста перед проверкой: «Kiwix» в «Kiwix library» не спасает строку.
const ALLOWED_WORDS = new Set(ALLOWLIST.flatMap((s) => s.split(/\s+/)))

// Атрибуты JSX, текст которых видит человек.
const TEXT_ATTR =
  /^(title|placeholder|alt|aria-label|label|description|text|message|subtitle|heading|tooltip|helperText|helpText|emptyMessage|.+Text|.+Label|.+Title|.+Message|.+Description)$/
// Свойства объектов с видимым текстом (уведомления, пункты меню, модальные окна).
const TEXT_PROP = /^(title|message|label|description|placeholder|confirmText|cancelText|subtitle|tooltip|ariaLabel|cta|helperText)$/
// Вызовы, строковые аргументы которых показываются человеку.
const NOTIFY_CALL = /^(addNotification|showError|showSuccess|showNotification|toast\w*|alert|confirm)$/

/** Есть ли в тексте английские слова (3+ латинские буквы), не считая названий программ; русский текст не считается. */
export function looksEnglish(raw: string): boolean {
  // HTML-знаки вроде &middot; и &#8212; — не слова.
  const text = raw.replace(/&[a-zA-Z]+;|&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()
  if (!text || ALLOWED.has(text)) return false
  if (/[А-Яа-яЁё]/.test(text)) return false
  if (/^(https?:\/\/|\/|#|\.\/|mailto:)/.test(text)) return false
  const words = text.match(/[A-Za-z][A-Za-z0-9'’-]*/g) ?? []
  return words.some((w) => {
    const bare = w.replace(/['’-]+$/, '')
    return /[A-Za-z]{3,}/.test(bare) && !ALLOWED_WORDS.has(bare)
  })
}

function listFiles(target: string): string[] {
  const st = statSync(target)
  if (st.isFile()) return /\.tsx?$/.test(target) ? [target] : []
  const out: string[] = []
  for (const name of readdirSync(target)) {
    if (name === 'node_modules') continue
    out.push(...listFiles(join(target, name)))
  }
  return out
}

function calleeName(expr: ts.Expression): string {
  if (ts.isIdentifier(expr)) return expr.text
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text
  return ''
}

/** Строки, которые выражение может «вернуть» как видимый текст: сам литерал, ветки ?:, части ||, ??, && и +. */
function visibleStrings(expr: ts.Expression | undefined): ts.Node[] {
  if (!expr) return []
  if (ts.isParenthesizedExpression(expr)) return visibleStrings(expr.expression)
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return [expr]
  if (ts.isTemplateExpression(expr)) return [expr]
  if (ts.isConditionalExpression(expr))
    return [...visibleStrings(expr.whenTrue), ...visibleStrings(expr.whenFalse)]
  if (ts.isBinaryExpression(expr)) {
    const op = expr.operatorToken.kind
    if (
      op === ts.SyntaxKind.BarBarToken ||
      op === ts.SyntaxKind.QuestionQuestionToken ||
      op === ts.SyntaxKind.PlusToken
    )
      return [...visibleStrings(expr.left), ...visibleStrings(expr.right)]
    if (op === ts.SyntaxKind.AmpersandAmpersandToken) return visibleStrings(expr.right)
  }
  return []
}

function textOf(node: ts.Node, sf: ts.SourceFile): string {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text
  if (ts.isTemplateExpression(node))
    return [node.head.text, ...node.templateSpans.map((s) => s.literal.text)].join(' … ')
  if (ts.isJsxText(node)) return node.text
  return node.getText(sf)
}

function scanFile(file: string): Untranslated[] {
  const source = readFileSync(file, 'utf8')
  const kind = file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind)
  const hits = new Map<number, Untranslated>()

  const report = (node: ts.Node) => {
    const text = textOf(node, sf).replace(/\s+/g, ' ').trim()
    if (!looksEnglish(text)) return
    const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1
    hits.set(node.getStart(sf), { file, line, text })
  }

  // Строки внутри аргументов уведомлений — вместе с полями объектов вроде { message: '…' }.
  const reportDeep = (node: ts.Node) => {
    if (ts.isCallExpression(node) && calleeName(node.expression) === 't') return
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node)
    ) {
      report(node)
      return
    }
    if (ts.isPropertyAssignment(node)) {
      const name = node.name.getText(sf)
      if (name === 'type' || name === 'variant' || name === 'icon') return
    }
    ts.forEachChild(node, reportDeep)
  }

  const visit = (node: ts.Node) => {
    if (ts.isJsxText(node)) {
      report(node)
    } else if (ts.isJsxExpression(node) && node.parent && !ts.isJsxAttribute(node.parent)) {
      // {cond ? 'Installed' : 'Install'} внутри разметки
      visibleStrings(node.expression).forEach(report)
    } else if (ts.isJsxAttribute(node)) {
      const name = node.name.getText(sf)
      if (TEXT_ATTR.test(name) && node.initializer) {
        if (ts.isStringLiteral(node.initializer)) report(node.initializer)
        else if (ts.isJsxExpression(node.initializer))
          visibleStrings(node.initializer.expression).forEach(report)
      }
    } else if (ts.isCallExpression(node) && NOTIFY_CALL.test(calleeName(node.expression))) {
      node.arguments.forEach(reportDeep)
    } else if (
      ts.isPropertyAssignment(node) &&
      TEXT_PROP.test(node.name.getText(sf).replace(/['"]/g, ''))
    ) {
      visibleStrings(node.initializer).forEach(report)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return [...hits.values()].sort((a, b) => a.line - b.line)
}

/** Все непереведённые строки в файле или папке (.tsx и .ts). */
export function findUntranslated(target: string): Untranslated[] {
  return listFiles(target).flatMap(scanFile)
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const found = process.argv.slice(2).flatMap((target) => findUntranslated(target))
  for (const f of found) console.log(`${relative(process.cwd(), f.file)}:${f.line} ${f.text}`)
  console.log(`Всего: ${found.length}`)
}
