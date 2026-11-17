import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * «Кладезъ»: библиотека, перенесённая с флешки («Копия на флешку»).
 *
 * На новом компьютере установщик кладёт в библиотеку дороги и модели ИИ, а в Docker — образы
 * программ маршрутов и ИИ с флешки. Интернета там может не быть, поэтому программы ставятся сами,
 * при запуске панели: только если их файлы уже лежат в библиотеке И образ уже есть в Docker —
 * тогда установка ничего не скачивает. Без образа — ничего не делаем (человек поставит по кнопке).
 */
export default class CopiedLibraryProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.getEnvironment() !== 'web') return

    setImmediate(async () => {
      try {
        const { existsSync, readdirSync } = await import('node:fs')
        const { join } = await import('node:path')
        const Service = (await import('#models/service')).default
        const { DockerService } = await import('#services/docker_service')
        const { MapRouteService } = await import('#services/map_route_service')
        const { SERVICE_NAMES } = await import('../constants/service_names.js')
        const Docker = (await import('dockerode')).default

        const docker = new Docker({ socketPath: '/var/run/docker.sock' })
        const tags = new Set(
          (await docker.listImages()).flatMap((image) => image.RepoTags ?? [])
        )

        const hasFiles = (dir: string) => {
          try {
            return existsSync(dir) && readdirSync(dir).length > 0
          } catch {
            return false
          }
        }
        const wanted: Array<{ name: string; reason: () => Promise<boolean> }> = [
          {
            name: SERVICE_NAMES.ROUTES,
            reason: async () => (await MapRouteService.installedRegions()).length > 0,
          },
          {
            name: SERVICE_NAMES.OLLAMA,
            reason: async () => hasFiles(join(process.cwd(), 'storage', 'ollama', 'models', 'manifests')),
          },
        ]

        const dockerService = new DockerService()
        for (const w of wanted) {
          const service = await Service.query().where('service_name', w.name).first()
          if (!service || service.installed || service.installation_status === 'installing') continue
          if (!tags.has(service.container_image)) continue
          if (!(await w.reason())) continue
          if (w.name === SERVICE_NAMES.ROUTES) await MapRouteService.prepare()
          const result = await dockerService.createContainerPreflight(w.name)
          logger.info(
            `[CopiedLibraryProvider] ${w.name}: файлы и образ с флешки на месте — ставлю без интернета: ${result.message}`
          )
        }
      } catch (error: any) {
        logger.warn(`[CopiedLibraryProvider] не вышло: ${error?.message ?? error}`)
      }
    })
  }
}
