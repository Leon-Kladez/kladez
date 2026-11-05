import { SystemService } from '#services/system_service'
import { ZimService } from '#services/zim_service'
import { CollectionManifestService } from '#services/collection_manifest_service'
import { BundleService } from '#services/bundle_service'
import vine from '@vinejs/vine'
import KVStore from '#models/kv_store'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'

const installBundleValidator = vine.compile(vine.object({ id: vine.string().trim().minLength(1) }))

@inject()
export default class EasySetupController {
  constructor(
    private systemService: SystemService,
    private zimService: ZimService
  ) {}

  async index({ inertia }: HttpContext) {
    const [services, remoteOllamaUrl] = await Promise.all([
      this.systemService.getServices({ installedOnly: false }),
      KVStore.getValue('ai.remoteOllamaUrl'),
    ])
    return inertia.render('easy-setup/index', {
      system: {
        services: services,
        remoteOllamaUrl: remoteOllamaUrl ?? '',
      },
    })
  }

  async complete({ inertia }: HttpContext) {
    return inertia.render('easy-setup/complete')
  }

  async listCuratedCategories({}: HttpContext) {
    return await this.zimService.listCuratedCategories()
  }

  /** Kladez: ready-made sets (Аптечка / Библиотека / Всё) with their status. */
  async listBundles({}: HttpContext) {
    return await new BundleService(this.zimService).listWithStatus()
  }

  /** Kladez: install a set — its Wikipedia option plus every tier it lists. */
  async installBundle({ request, response }: HttpContext) {
    const { id } = await request.validateUsing(installBundleValidator)
    try {
      return { success: true, ...(await new BundleService(this.zimService).install(id)) }
    } catch (error: any) {
      return response.badRequest({ success: false, message: error?.message ?? String(error) })
    }
  }

  async refreshManifests({}: HttpContext) {
    const manifestService = new CollectionManifestService()
    const [zimChanged, mapsChanged, wikiChanged, bundlesChanged, mirrorsChanged] = await Promise.all([
      manifestService.fetchAndCacheSpec('zim_categories'),
      manifestService.fetchAndCacheSpec('maps'),
      manifestService.fetchAndCacheSpec('wikipedia'),
      manifestService.fetchAndCacheSpec('bundles'),
      manifestService.fetchAndCacheSpec('mirrors'),
    ])

    return {
      success: true,
      changed: {
        zim_categories: zimChanged,
        maps: mapsChanged,
        wikipedia: wikiChanged,
        bundles: bundlesChanged,
        mirrors: mirrorsChanged,
      },
    }
  }
}
