import logger from '@adonisjs/core/services/logger'
import type { ApplicationService } from '@adonisjs/core/types'

/**
 * «Кладезъ»: «Распознавание речи» обновляется вместе с Кладезем — новая модель и скрипт запуска
 * подтягиваются сами, в фоне при запуске панели (без интернета — тихо остаётся как было).
 */
export default class SpeechRefreshProvider {
  constructor(protected app: ApplicationService) {}

  async boot() {
    if (this.app.getEnvironment() !== 'web') return
    setImmediate(async () => {
      try {
        const { DockerService } = await import('#services/docker_service')
        await new DockerService().refreshWhisper()
      } catch (err: any) {
        logger.warn(`[SpeechRefresh] не удалось обновить распознавание речи: ${err?.message ?? err}`)
      }
    })
  }
}
