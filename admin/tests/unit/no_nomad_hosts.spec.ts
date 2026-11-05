import * as assert from 'node:assert/strict'
import { test } from 'node:test'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

/**
 * Kladez: the app must not talk to Project NOMAD's servers (privacy, and so it
 * keeps working if they change). This scans string literals in app/ and start/
 * for NOMAD hosts. Each remaining exception is listed with the part that owns it.
 */
const FORBIDDEN = [/projectnomad\.us/, /nomad-packs-worker/, /Crosstalk-Solutions\/project-nomad\//i]

const ALLOWED: Array<{ file: string; pattern: RegExp; why: string }> = [
  { file: 'app/services/auto_update_service.ts', pattern: /ghcr\.io\/crosstalk-solutions\/project-nomad/, why: 'Docker image — part 5 (installer)' },
  { file: 'app/services/kiwix_catalog_service.ts', pattern: /project-nomad-maps/, why: 'maps — part 3' },
  { file: 'app/services/map_service.ts', pattern: /project-nomad-maps|project-nomad\//, why: 'maps — part 3' },
  { file: 'constants/misc.ts', pattern: /api\.projectnomad\.us/, why: 'AI model list (plain GET, no user data) — needs a Kladez-hosted list; open question for the author' },
]

const SCANNED = ['app', 'start', 'constants', 'commands']

function* tsFiles(dir: string): Generator<string> {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name)
    if (statSync(p).isDirectory()) yield* tsFiles(p)
    else if (p.endsWith('.ts')) yield p
  }
}

function literalHits(forbidden: RegExp[], allowed: typeof ALLOWED): string[] {
  const root = process.cwd()
  const hits: string[] = []
  for (const dir of SCANNED) {
    for (const file of tsFiles(join(root, dir))) {
      const rel = relative(root, file).replace(/\\/g, '/')
      const src = readFileSync(file, 'utf-8')
      for (const lit of src.match(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g) ?? []) {
        if (!forbidden.some((re) => re.test(lit))) continue
        if (allowed.some((a) => a.file === rel && a.pattern.test(lit))) continue
        hits.push(`${rel}: ${lit}`)
      }
    }
  }
  return hits
}

test('no string literal points at Project NOMAD servers', () => {
  assert.deepEqual(literalHits(FORBIDDEN, ALLOWED), [])
})

// Kladez: the main Wikipedia is Russian; English-only checks silently skip it.
test('no code checks for the English Wikipedia file prefix', () => {
  assert.deepEqual(
    literalHits([/wikipedia_en_'?$|^'wikipedia_en_'$|wikipedia_en_100_mini/], []),
    []
  )
})
