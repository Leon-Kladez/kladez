import * as assert from 'node:assert/strict'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { test } from 'node:test'

// Кладезъ должен открываться без интернета: шрифты, картинки и стили — только из admin/public/.
const ADMIN = join(import.meta.dirname, '..', '..')

function walk(dir: string, ext: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) out.push(...walk(full, ext))
    else if (name.endsWith(ext)) out.push(full)
  }
  return out
}

// Загружаемые ресурсы: src=, url(, <link href=. Обычные ссылки <a href="https://…"> разрешены —
// это переход по клику, а не то, без чего страница не откроется.
const EXTERNAL = /src\s*=\s*\{?\s*["'`]https?:\/\/|url\(\s*["']?https?:\/\/|<link[^>]*href\s*=\s*["']https?:\/\//

test('нет внешних адресов в src=, url( и <link href=', () => {
  const files = [
    join(ADMIN, 'resources', 'views', 'inertia_layout.edge'),
    join(ADMIN, 'inertia', 'css', 'app.css'),
    ...walk(join(ADMIN, 'inertia'), '.tsx'),
  ]
  const found: string[] = []
  for (const file of files) {
    const lines = readFileSync(file, 'utf8').split('\n')
    lines.forEach((line, i) => {
      if (line.match(EXTERNAL)) found.push(`${relative(ADMIN, file)}:${i + 1} ${line.trim()}`)
    })
  }
  assert.deepEqual(found, [])
})

test('страница объявлена русской', () => {
  const layout = readFileSync(join(ADMIN, 'resources', 'views', 'inertia_layout.edge'), 'utf8')
  assert.match(layout, /lang="ru"/)
  assert.match(layout, /<title inertia>Кладезъ<\/title>/)
  assert.doesNotMatch(layout, /Project NOMAD/)
})

test('шаблон страницы один — тот, что указан в adonisrc.ts', () => {
  const rc = readFileSync(join(ADMIN, 'adonisrc.ts'), 'utf8')
  assert.match(rc, /resources\/views\/\*\*\/\*\.edge/)
  assert.ok(!existsSync(join(ADMIN, 'views', 'inertia_layout.edge')), 'лишняя копия admin/views/inertia_layout.edge')
})

test('шрифты логотипа лежат локально', () => {
  for (const font of ['Ponomar-Regular.woff2', 'OldStandardTT-Regular.woff2']) {
    assert.ok(existsSync(join(ADMIN, 'public', 'fonts', font)), `нет public/fonts/${font}`)
  }
  assert.ok(existsSync(join(ADMIN, 'public', 'fonts', 'OFL.txt')), 'нет лицензии шрифтов OFL.txt')
})

test('стили подключают шрифты логотипа из /fonts/', () => {
  const css = readFileSync(join(ADMIN, 'inertia', 'css', 'app.css'), 'utf8')
  assert.match(css, /url\(['"]?\/fonts\/Ponomar-Regular\.woff2/)
  assert.match(css, /url\(['"]?\/fonts\/OldStandardTT-Regular\.woff2/)
})

test('в подвале есть ссылка на страницу «О программе» с упоминанием Project NOMAD', () => {
  for (const file of ['Footer.tsx', 'StyledSidebar.tsx']) {
    const src = readFileSync(join(ADMIN, 'inertia', 'components', file), 'utf8')
    assert.match(src, /href="\/about"/, `нет ссылки на /about в ${file}`)
  }
})
