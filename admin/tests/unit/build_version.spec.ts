import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// «Кладезъ»: в подвале собранной панели — «Кладезъ 0.x.y», а не «dev».
// Номер попадает в образ только через --build-arg VERSION (Dockerfile → /app/version.json).
const ROOT = join(import.meta.dirname, '..', '..', '..')
const read = (...p: string[]) => readFileSync(join(ROOT, ...p), 'utf8')

test('сборка установщика передаёт номер версии в образ панели', () => {
  const wf = read('.github', 'workflows', 'installer.yml')
  assert.match(wf, /docker build --build-arg VERSION="\$\{VERSION\}" -t "ghcr\.io\/leon-kladez\/kladez:\$\{VERSION\}" \./)
})

test('пробная сборка тоже передаёт номер версии', () => {
  const wf = read('.github', 'workflows', 'preview-admin-image.yml')
  assert.match(wf, /--build-arg VERSION="\$\{VERSION\}"/)
  assert.doesNotMatch(wf, /VERSION=preview\b/)
})

test('Dockerfile пишет VERSION в version.json', () => {
  const df = read('Dockerfile')
  assert.match(df, /ARG VERSION=dev/)
  assert.match(df, /echo "\{\\"version\\":\\"\$\{VERSION\}\\"\}" > \/app\/version\.json/)
})

test('подвал: «Кладезъ 0.1.5», без «v»', async () => {
  const { tIn } = await import('../../constants/i18n/index.js')
  assert.equal(tIn('ru', 'common.footer.version', { version: '0.1.5' }), 'Кладезъ 0.1.5')
  assert.equal(tIn('en', 'common.footer.version', { version: '0.1.5' }), 'Kladez 0.1.5')
})
