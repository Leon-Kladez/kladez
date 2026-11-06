import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import vine, { errors } from '@vinejs/vine'
import { CATALOG_FILES, type CatalogFileType } from './catalog_source.js'
import {
  zimCategoriesSpecSchema,
  mapsSpecSchema,
  wikipediaSpecSchema,
  creatorPacksSpecSchema,
  bundlesSpecSchema,
  mirrorsSpecSchema,
} from '../validators/curated_collections.js'

/**
 * Kladez: the copy of collections-ru/ baked into the image. Used when the app
 * starts with no internet and no cached catalog, so the setup wizard still shows
 * the bundles and categories instead of an empty screen. Reading never throws: a
 * missing or broken file is simply "no bundled copy".
 */
export function bundledCatalogDir(cwd: string = process.cwd()): string {
  // The image has WORKDIR /app and `COPY collections-ru/ /app/collections-ru/`.
  return process.env.KLADEZ_BUNDLED_CATALOG_DIR ?? join(cwd, 'collections-ru')
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

/** The schemas the service validates each catalog with (same as on a network fetch). */
export const CATALOG_SCHEMAS = {
  zim_categories: zimCategoriesSpecSchema,
  maps: mapsSpecSchema,
  wikipedia: wikipediaSpecSchema,
  creator_packs: creatorPacksSpecSchema,
  bundles: bundlesSpecSchema,
  mirrors: mirrorsSpecSchema,
} as const

export type ValidatedCatalogType = keyof typeof CATALOG_SCHEMAS

/**
 * Validate a catalog file and say exactly what is wrong. VineJS errors carry
 * their details in `messages`, not `message`, so they are spelled out here.
 */
export async function validateBundledSpec(
  type: ValidatedCatalogType,
  data: unknown
): Promise<{ ok: true; value: any } | { ok: false; error: string }> {
  try {
    return { ok: true, value: await vine.validate({ schema: CATALOG_SCHEMAS[type] as any, data }) }
  } catch (error: any) {
    if (error instanceof errors.E_VALIDATION_ERROR) {
      const details = (error.messages as Array<{ field: string; message: string }>)
        .slice(0, 5)
        .map((m) => `${m.field}: ${m.message}`)
        .join('; ')
      return { ok: false, error: details || error.message }
    }
    return { ok: false, error: error?.message ?? String(error) }
  }
}

/**
 * `fetched_at` of a cached built-in copy: old enough that any real fetch is
 * newer, and inside MySQL's TIMESTAMP range (epoch 0 is rejected by MySQL —
 * that broke the offline catalog in the first test image).
 */
export const BUNDLED_FETCHED_AT_ISO = '2000-01-01T00:00:00Z'
