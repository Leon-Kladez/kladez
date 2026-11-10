import { MapService } from '#services/map_service'
import MapMarker from '#models/map_marker'
import {
  assertNotPrivateUrl,
  downloadCollectionValidator,
  downloadMapPackagesValidator,
  filenameParamValidator,
  mapExtractPreflightValidator,
  mapExtractValidator,
  remoteDownloadValidator,
  remoteDownloadValidatorOptional,
} from '#validators/common'
import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import vine from '@vinejs/vine'
import { t } from '../../constants/i18n/index.js'
import logger from '@adonisjs/core/services/logger'
import { humanizeError } from '../utils/user_errors.js'
import { describeHere, MapSearchService } from '#services/map_search_service'
import { MapRouteService, RouteError } from '#services/map_route_service'
import { DockerService } from '#services/docker_service'
import { ROUTE_MODES, type RouteMode } from '../utils/map_route.js'
import { getLocale } from '../../constants/i18n/index.js'

const searchQueryValidator = vine.compile(
  vine.object({
    q: vine.string().trim().minLength(1).maxLength(200),
    lat: vine.number().min(-90).max(90).optional(),
    lon: vine.number().min(-180).max(180).optional(),
    limit: vine.number().min(1).max(50).optional(),
  })
)
const routeQueryValidator = vine.compile(
  vine.object({
    fromLat: vine.number().min(-90).max(90),
    fromLon: vine.number().min(-180).max(180),
    toLat: vine.number().min(-90).max(90),
    toLon: vine.number().min(-180).max(180),
    mode: vine.enum(ROUTE_MODES),
  })
)
const searchPointValidator = vine.compile(
  vine.object({
    lat: vine.number().min(-90).max(90),
    lon: vine.number().min(-180).max(180),
  })
)

@inject()
export default class MapsController {
  constructor(private mapService: MapService) {}

  async index({ inertia }: HttpContext) {
    const baseAssetsCheck = await this.mapService.ensureBaseAssets()
    const [regionFiles, worldBasemapExists, startBounds, searchRegions] = await Promise.all([
      this.mapService.listRegions(),
      this.mapService.checkWorldBasemapExists(),
      this.mapService.downloadedRegionsBounds(),
      MapSearchService.available(),
    ])
    return inertia.render('maps', {
      maps: {
        baseAssetsExist: baseAssetsCheck,
        worldBasemapExists,
        regionFiles: regionFiles.files,
        startBounds,
        searchRegions,
      },
    })
  }

  // ---- Кладезъ: поиск по карте ----

  async search({ request, response }: HttpContext) {
    const { q, lat, lon, limit } = await searchQueryValidator.validate(request.qs())
    try {
      const results = await MapSearchService.search(q, { lat, lon, limit, english: getLocale() === 'en' })
      return { results }
    } catch (error) {
      logger.error({ err: error }, '[MapsController] search failed')
      return response.status(500).send({ message: humanizeError(error) })
    }
  }

  /** «Что здесь?»: адрес, места рядом, район, город и регион — из скачанных указателей. */
  async here({ request }: HttpContext) {
    const { lat, lon } = await searchPointValidator.validate(request.qs())
    try {
      const info = await describeHere(lat, lon)
      return { ...info, regionTitle: info.region ? await this.mapService.regionTitle(info.region) : null }
    } catch (error) {
      logger.warn({ err: error }, '[MapsController] here failed')
      return { address: null, nearby: [], district: null, settlement: null, region: null, regionTitle: null }
    }
  }

  async searchAddress({ request }: HttpContext) {
    const { lat, lon } = await searchPointValidator.validate(request.qs())
    try {
      return { address: await MapSearchService.addressAt(lat, lon) }
    } catch (error) {
      logger.warn({ err: error }, '[MapsController] address lookup failed')
      return { address: null }
    }
  }

  // ---- Кладезъ: маршруты ----

  /** Маршрут — GET: только чтение, работает и с телефона. */
  async route({ request, response }: HttpContext) {
    const q = await routeQueryValidator.validate(request.qs())
    try {
      return await MapRouteService.route(
        new DockerService(),
        { lat: q.fromLat, lon: q.fromLon },
        { lat: q.toLat, lon: q.toLon },
        q.mode as RouteMode
      )
    } catch (error) {
      const key = error instanceof RouteError ? error.key : 'routes.failed'
      if (!(error instanceof RouteError)) logger.error({ err: error }, '[MapsController] route failed')
      return response.status(422).send({ key, message: t(key as any) })
    }
  }

  async routesStatus({}: HttpContext) {
    return await this.mapService.routesStatus()
  }

  async routesEnable({ request, response }: HttpContext) {
    try {
      const all = request.input('all') === true || request.input('all') === 'true'
      return await this.mapService.enableRoutes(new DockerService(), { all })
    } catch (error) {
      logger.error({ err: error }, '[MapsController] enable routes failed')
      return response.status(502).send({ message: humanizeError(error) })
    }
  }

  async searchStatus({}: HttpContext) {
    return await this.mapService.searchIndexStatus()
  }

  async searchDownload({ response }: HttpContext) {
    try {
      return await this.mapService.ensureSearchIndexes()
    } catch (error) {
      logger.error({ err: error }, '[MapsController] search index download failed')
      return response.status(502).send({ message: humanizeError(error) })
    }
  }

  async downloadBaseAssets({ request }: HttpContext) {
    const payload = await request.validateUsing(remoteDownloadValidatorOptional)
    if (payload.url) assertNotPrivateUrl(payload.url)
    await this.mapService.downloadBaseAssets(payload.url)
    return { success: true }
  }

  async setupWorldBasemap({ response }: HttpContext) {
    try {
      const ready = await this.mapService.provisionWorldBasemap()
      if (!ready) {
        return response.status(500).send({
          message:
            t('server.mapsController.couldNotDownloadTheBase'),
        })
      }
      return { success: true }
    } catch {
      return response.status(500).send({
        message:
          t('server.mapsController.couldNotDownloadTheBase'),
      })
    }
  }

  async downloadRemote({ request }: HttpContext) {
    const payload = await request.validateUsing(remoteDownloadValidator)
    assertNotPrivateUrl(payload.url)
    const filename = await this.mapService.downloadRemote(payload.url)
    return {
      message: t('server.mapsController.downloadStartedSuccessfully'),
      filename,
      url: payload.url,
    }
  }

  async downloadCollection({ request }: HttpContext) {
    const payload = await request.validateUsing(downloadCollectionValidator)
    const resources = await this.mapService.downloadCollection(payload.slug)
    return {
      message: t('server.mapsController.collectionDownloadStartedSuccessfully'),
      slug: payload.slug,
      resources,
    }
  }

  async downloadPackages({ request }: HttpContext) {
    const payload = await request.validateUsing(downloadMapPackagesValidator)
    return this.mapService.downloadPackages(payload.ids)
  }

  // For providing a "preflight" check in the UI before actually starting a background download
  async downloadRemotePreflight({ request }: HttpContext) {
    const payload = await request.validateUsing(remoteDownloadValidator)
    assertNotPrivateUrl(payload.url)
    const info = await this.mapService.downloadRemotePreflight(payload.url)
    return info
  }

  async fetchLatestCollections({}: HttpContext) {
    const success = await this.mapService.fetchLatestCollections()
    return { success }
  }

  async listCuratedCollections({}: HttpContext) {
    return await this.mapService.listCuratedCollections()
  }

  async listRegions({}: HttpContext) {
    return await this.mapService.listRegions()
  }

  async globalMapInfo({}: HttpContext) {
    // «Кладезъ»: это лишь предложение «скачать карту мира». Нет связи с protomaps —
    // просто не показываем его, а не всплывающую «ошибку 500».
    try {
      return await this.mapService.getGlobalMapInfo()
    } catch (error) {
      logger.warn(`[MapsController] global map info unavailable: ${error instanceof Error ? error.message : error}`)
      return null
    }
  }

  async downloadGlobalMap({}: HttpContext) {
    const result = await this.mapService.downloadGlobalMap()
    return {
      message: t('server.mapsController.downloadStartedSuccessfully'),
      ...result,
    }
  }

  async picker({}: HttpContext) {
    return this.mapService.pickerData()
  }

  async ruDistricts({ response }: HttpContext) {
    response.header('Cache-Control', 'public, max-age=86400')
    return response.download(this.mapService.ruDistrictsSchemaPath())
  }

  async listCountries({}: HttpContext) {
    return { countries: await this.mapService.listCountries() }
  }

  async listCountryGroups({}: HttpContext) {
    return { groups: await this.mapService.listCountryGroups() }
  }

  // Kladez: вырезка идёт из мировой карты в интернете. Нет связи — понятный текст,
  // а не голая «ошибка 500».
  async extractPreflight({ request, response }: HttpContext) {
    const payload = await request.validateUsing(mapExtractPreflightValidator)
    try {
      return await this.mapService.extractPreflight(payload)
    } catch (error) {
      logger.warn(`[MapsController] extract preflight failed: ${error instanceof Error ? error.message : error}`)
      return response.status(502).send({ success: false, message: humanizeError(error) })
    }
  }

  async extractRegion({ request, response }: HttpContext) {
    const payload = await request.validateUsing(mapExtractValidator)
    try {
      const result = await this.mapService.extractRegion(payload)
      return {
        message: t('server.mapsController.extractStartedSuccessfully'),
        ...result,
      }
    } catch (error) {
      logger.warn(`[MapsController] extract failed: ${error instanceof Error ? error.message : error}`)
      return response.status(502).send({ success: false, message: humanizeError(error) })
    }
  }

  async styles({ request, response }: HttpContext) {
    // Automatically ensure base assets are present before generating styles
    const baseAssetsExist = await this.mapService.ensureBaseAssets()
    if (!baseAssetsExist) {
      return response.status(500).send({
        message:
          t('server.mapsController.baseMapAssetsAreMissing'),
      })
    }

    const forwardedProto = request.headers()['x-forwarded-proto'];

    const protocol: string = forwardedProto
      ? (typeof forwardedProto === 'string' ? forwardedProto : request.protocol())
      : request.protocol();

    const styles = await this.mapService.generateStylesJSON(request.host(), protocol)
    return response.json(styles)
  }

  async delete({ request, response }: HttpContext) {
    const payload = await request.validateUsing(filenameParamValidator)

    try {
      await this.mapService.delete(payload.params.filename)
    } catch (error) {
      if (error.message === 'not_found') {
        return response.status(404).send({
          message: t('server.mapsController.mapFileWithKeyNot', { filename: payload.params.filename }),
        })
      }
      throw error // Re-throw any other errors and let the global error handler catch
    }

    return {
      message: t('server.mapsController.mapFileDeletedSuccessfully'),
    }
  }

  // --- Map Markers ---

  async listMarkers({}: HttpContext) {
    return await MapMarker.query().orderBy('created_at', 'asc')
  }

  async createMarker({ request }: HttpContext) {
    const payload = await request.validateUsing(
      vine.compile(
        vine.object({
          name: vine.string().trim().minLength(1).maxLength(255),
          longitude: vine.number().min(-180).max(180),
          latitude: vine.number().min(-90).max(90),
          color: vine.string().trim().maxLength(20).optional(),
          custom_color: vine.string().trim().maxLength(7).nullable().optional(),
          icon: vine.string().trim().maxLength(50).nullable().optional(),
          icon_color: vine.string().trim().maxLength(7).nullable().optional(),
          visible: vine.boolean().optional(),
          notes: vine.string().trim().maxLength(500).nullable().optional(),
          marker_type: vine.string().trim().maxLength(20).optional(),
        })
      )
    )

    const marker = await MapMarker.create({
      name: payload.name,
      longitude: payload.longitude,
      latitude: payload.latitude,
      color: payload.color ?? 'orange',
      custom_color: payload.custom_color ?? null,
      icon: payload.icon ?? null,
      icon_color: payload.icon_color ?? null,
      visible: payload.visible ?? true,
      notes: payload.notes ?? null,
      marker_type: payload.marker_type ?? 'pin',
    })

    return marker
  }

  async updateMarker({ request, response }: HttpContext) {
    const { id } = request.params()
    const marker = await MapMarker.find(id)

    if (!marker) {
      return response.status(404).send({ message: t('server.mapsController.markerNotFound') })
    }

    const payload = await request.validateUsing(
      vine.compile(
        vine.object({
          name: vine.string().trim().minLength(1).maxLength(255).optional(),
          color: vine.string().trim().maxLength(20).optional(),
          custom_color: vine.string().trim().maxLength(7).nullable().optional(),
          icon: vine.string().trim().maxLength(50).nullable().optional(),
          icon_color: vine.string().trim().maxLength(7).nullable().optional(),
          visible: vine.boolean().optional(),
          longitude: vine.number().min(-180).max(180).optional(),
          latitude: vine.number().min(-90).max(90).optional(),
          notes: vine.string().trim().maxLength(500).nullable().optional(),
          marker_type: vine.string().trim().maxLength(20).optional(),
        })
      )
    )

    if (payload.name !== undefined) marker.name = payload.name
    if (payload.color !== undefined) marker.color = payload.color
    if (payload.custom_color !== undefined) marker.custom_color = payload.custom_color
    if (payload.icon !== undefined) marker.icon = payload.icon
    if (payload.icon_color !== undefined) marker.icon_color = payload.icon_color
    if (payload.visible !== undefined) marker.visible = payload.visible
    if (payload.longitude !== undefined) marker.longitude = payload.longitude
    if (payload.latitude !== undefined) marker.latitude = payload.latitude
    if (payload.notes !== undefined) marker.notes = payload.notes
    if (payload.marker_type !== undefined) marker.marker_type = payload.marker_type

    await marker.save()
    return marker
  }

  async deleteMarker({ request, response }: HttpContext) {
    const { id } = request.params()
    const marker = await MapMarker.find(id)
    if (!marker) {
      return response.status(404).send({ message: t('server.mapsController.markerNotFound') })
    }
    await marker.delete()
    return { message: t('server.mapsController.markerDeleted') }
  }
}
