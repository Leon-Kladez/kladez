import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { CATALOG_FILES, type CatalogFileType } from './catalog_source.js'

/**
 * Kladez: the copy of collections-ru/ baked into the image. Used when the app
 * starts with no internet and no cached catalog, so the setup wizard still shows
 * the bundles and categories instead of an empty screen. Never throws: a missing
 * or broken file is simply "no bundled copy".
 */
export function bundledCatalogDir(): string {
  return process.env.KLADEZ_BUNDLED_CATALOG_DIR ?? join(process.cwd(), 'collections-ru')
}

export async function readBundledSpec(
  type: CatalogFileType,
  dir: string = bundledCatalogDir()
): Promise<unknown | null> {
  try {
    return JSON.parse(await readFile(join(dir, CATALOG_FILES[type]), 'utf-8'))
  } catch {
    return null
  }
}
