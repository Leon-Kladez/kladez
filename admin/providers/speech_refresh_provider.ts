import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * «Кладезъ»: в фоне при запуске панели — «Распознавание речи» подтягивает новую модель и скрипт,
 * а «Учебная платформа» докачивает русские видеоуроки, если в прошлый раз не вышло
 * (без интернета — тихо остаётся как было).
 */
export default class SpeechRefreshProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.getEnvironment() !== 'web') return
    setImmediate(async () => {
      try {
        const { DockerService } = await import('#services/docker_service')
        const docker = new DockerService()
        await docker.refreshWhisper()
        await docker.importKolibriStarterChannels()
      } catch (err: any) {
        logger.warn(`[SpeechRefresh] не удалось обновить распознавание речи: ${err?.message ?? err}`)
      }
    })
  }
}
