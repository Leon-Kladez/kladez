import logger from '@adonisjs/core/services/logger'
import { CollectionManifestService } from './collection_manifest_service.js'
import type { ZimService } from './zim_service.js'
import { bundleSizeMb, bundleStatus, type BundleStatus } from '../utils/bundles.js'
import type { Bundle, BundlesSpec, WikipediaOption, ZimCategoriesSpec } from '../../types/collections.js'

export type BundleWithStatus = Bundle & { status: BundleStatus }

/**
 * Kladez: ready-made sets «Аптечка / Библиотека / Всё». Installing a bundle is
 * exactly what a person would do by hand in the wizard: pick the Wikipedia
 * option, then each category tier — through the existing install paths.
 */
export class BundleService {
  private manifests = new CollectionManifestService()

  constructor(private zimService: ZimService) {}

  private async specs() {
    const [bundles, categories, wikipedia] = await Promise.all([
      this.manifests.getSpecWithFallback<BundlesSpec>('bundles'),
      this.manifests.getSpecWithFallback<ZimCategoriesSpec>('zim_categories'),
      this.manifests.getSpecWithFallback<{ options: WikipediaOption[] }>('wikipedia'),
    ])
    if (!bundles || !categories) throw new Error('Could not load bundles or categories catalog')
    return { bundles, categories, wikipedia }
  }

  async listWithStatus(): Promise<BundleWithStatus[]> {
    const { bundles, categories, wikipedia } = await this.specs()
    const [catStatus, selection] = await Promise.all([
      this.manifests.getCategoriesWithStatus(),
      this.zimService.getWikipediaSelection(),
    ])
    const installedTierByCategory = Object.fromEntries(catStatus.map((c) => [c.slug, c.installedTierSlug]))
    const downloadingTierByCategory = Object.fromEntries(catStatus.map((c) => [c.slug, c.downloadingTierSlug]))
    const wikiSize = (id: string) => wikipedia?.options.find((o) => o.id === id)?.size_mb ?? 0

    return bundles.bundles.map((b) => ({
      ...b,
      // Recomputed from the live catalog so the shown size follows refreshed versions.
      size_mb: bundleSizeMb(b, categories, wikiSize(b.wikipedia)),
      status: bundleStatus(b, categories, {
        wikipedia: selection ? { option_id: selection.option_id, status: selection.status } : null,
        installedTierByCategory,
        downloadingTierByCategory,
      }),
    }))
  }

  async install(bundleId: string): Promise<{ wikipedia: string; tiers: string[] }> {
    const { bundles, categories } = await this.specs()
    const bundle = bundles.bundles.find((b) => b.id === bundleId)
    if (!bundle) throw new Error(`Bundle not found: ${bundleId}`)

    await this.zimService.selectWikipedia(bundle.wikipedia)

    const started: string[] = []
    for (const tierSlug of bundle.tiers) {
      const category = categories.categories.find((c) => c.tiers.some((t) => t.slug === tierSlug))
      if (!category) throw new Error(`Tier not found in catalog: ${tierSlug}`)
      // downloadCategoryTier resolves includesTier and skips what is installed.
      await this.zimService.downloadCategoryTier(category.slug, tierSlug)
      started.push(tierSlug)
    }
    logger.info(`[BundleService] Bundle ${bundle.id}: wikipedia=${bundle.wikipedia}, tiers=${started.join(',')}`)
    return { wikipedia: bundle.wikipedia, tiers: started }
  }
}
