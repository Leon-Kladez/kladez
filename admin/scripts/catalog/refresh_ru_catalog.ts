/**
 * Kladez: monthly refresh of collections-ru/ from the Kiwix catalog.
 *
 *   npm run catalog:refresh            (from admin/)
 *
 * For every resource and Wikipedia option it asks the public Kiwix OPDS catalog
 * for the newest build, updates version/url/size only when strictly newer,
 * HEAD-checks each new link, recomputes bundle sizes and bumps spec_version.
 * Sends nothing but plain catalog GET/HEAD requests. Exit code 1 if a link is
 * broken, so the workflow does not open a PR with dead links.
 */
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import axios from 'axios'
import { XMLParser } from 'fast-xml-parser'
import { applyLatest, applyLatestToWikipedia } from './refresh_lib.js'
import { bundleSizeMb } from '../../app/utils/bundles.js'
import { wikipediaOptionToResource } from '../../app/utils/wikipedia_option_resolution.js'
import type { CatalogResult } from '../../app/services/kiwix_catalog_service.js'
import type { BundlesSpec, ZimCategoriesSpec } from '../../types/collections.js'

const DIR = join(process.cwd(), '..', 'collections-ru')
const OPDS = 'https://opds.library.kiwix.org/catalog/v2/entries'
const UA = { 'User-Agent': 'Kladez/1.0 (+https://github.com/Leon-Kladez/kladez)' }
const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' })

const readJson = async (f: string) => JSON.parse(await readFile(join(DIR, f), 'utf-8'))
const writeJson = (f: string, data: unknown) =>
  writeFile(join(DIR, f), JSON.stringify(data, null, 2) + '\n', 'utf-8')

async function opdsLinks(name: string): Promise<{ href: string; length: number }[]> {
  const res = await axios.get(OPDS, { params: { name, count: -1 }, headers: UA, timeout: 30000 })
  const entries = [parser.parse(res.data)?.feed?.entry ?? []].flat()
  return entries.flatMap((e: any) =>
    [e.link ?? []].flat()
      .filter((l: any) => String(l.rel ?? '').includes('acquisition'))
      .map((l: any) => ({ href: String(l.href).replace(/\.meta4$/, ''), length: Number(l.length) || 0 }))
  )
}

/** Newest `<id>_YYYY-MM.zim`, looked up by exact name, then by name without the flavour. */
async function latestFor(id: string): Promise<CatalogResult | null> {
  const re = new RegExp(`/${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}_(\\d{4}-\\d{2})\\.zim$`)
  const names = [id, id.replace(/_(maxi|nopic|mini)$/, '')]
  for (const name of [...new Set(names)]) {
    const hits = (await opdsLinks(name))
      .map((l) => ({ ...l, m: re.exec(l.href) }))
      .filter((l) => l.m)
      .sort((a, b) => (a.m![1] < b.m![1] ? 1 : -1))
    if (hits.length) {
      const h = hits[0]
      return { version: h.m![1], download_url: h.href.replace('mirror.download.kiwix.org', 'download.kiwix.org'), size_bytes: h.length }
    }
  }
  return null
}

async function main() {
  const cats: ZimCategoriesSpec = await readJson('kiwix-categories.json')
  const wiki = await readJson('wikipedia.json')
  const bundles: BundlesSpec = await readJson('bundles.json')

  const ids = new Set<string>()
  cats.categories.forEach((c) => c.tiers.forEach((t) => t.resources.forEach((r) => ids.add(r.id))))
  wiki.options.forEach((o: any) => {
    const r = o.url ? wikipediaOptionToResource(o) : null
    if (r) ids.add(r.id)
  })

  const latest = new Map<string, CatalogResult>()
  for (const id of ids) {
    const l = await latestFor(id).catch((e) => (console.warn(`! ${id}: ${e.message}`), null))
    if (l) latest.set(`zim:${id}`, l)
  }

  console.log(`Kiwix catalog answered for ${latest.size} of ${ids.size} files.`)
  const missing = [...ids].filter((id) => !latest.has(`zim:${id}`))
  if (missing.length) console.warn(`Not found in Kiwix catalog: ${missing.join(', ')}`)

  const newCats = applyLatest(cats, latest)
  const newWiki = applyLatestToWikipedia(wiki, latest)
  const changed = JSON.stringify(newCats) !== JSON.stringify(cats) || JSON.stringify(newWiki) !== JSON.stringify(wiki)
  if (!changed) {
    console.log('Catalog is up to date.')
    return
  }

  // HEAD-check every link that changed.
  const before = new Set<string>([
    ...cats.categories.flatMap((c) => c.tiers.flatMap((t) => t.resources.map((r) => r.url))),
    ...wiki.options.map((o: any) => o.url),
  ])
  const after = [
    ...newCats.categories.flatMap((c) => c.tiers.flatMap((t) => t.resources.map((r) => r.url))),
    ...newWiki.options.map((o: any) => o.url).filter(Boolean),
  ]
  const broken: string[] = []
  for (const url of after.filter((u) => !before.has(u))) {
    const ok = await axios
      .head(url, { headers: UA, timeout: 30000, maxRedirects: 5 })
      .then((r) => r.status === 200)
      .catch(() => false)
    console.log(`${ok ? 'OK  ' : 'FAIL'} ${url}`)
    if (!ok) broken.push(url)
  }
  if (broken.length) {
    console.error(`${broken.length} new link(s) do not answer; catalog not written.`)
    process.exit(1)
  }

  const today = new Date().toISOString().slice(0, 10)
  const wikiMb = (id: string) => newWiki.options.find((o: any) => o.id === id)?.size_mb ?? 0
  const newBundles: BundlesSpec = {
    spec_version: today,
    bundles: bundles.bundles.map((b) => ({ ...b, size_mb: bundleSizeMb(b, newCats, wikiMb(b.wikipedia)) })),
  }
  await writeJson('kiwix-categories.json', { ...newCats, spec_version: today })
  await writeJson('wikipedia.json', { ...newWiki, spec_version: today })
  await writeJson('bundles.json', newBundles)
  console.log(`Catalog refreshed (spec_version ${today}).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
