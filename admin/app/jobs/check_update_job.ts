import { Job } from 'bullmq'
import { QueueService } from '#services/queue_service'
import { DockerService } from '#services/docker_service'
import { SystemService } from '#services/system_service'
import logger from '@adonisjs/core/services/logger'
import KVStore from '#models/kv_store'

export class CheckUpdateJob {
  static get queue() {
    return 'system'
  }

  static get key() {
    return 'check-update'
  }

  async handle(_job: Job) {
    logger.info('[CheckUpdateJob] Running update check...')

    const dockerService = new DockerService()
    const systemService = new SystemService(dockerService)

    try {
      // «Кладезъ»: force — иначе checkLatestVersion отдаёт запомненный ответ и на GitHub не ходит:
      // плановая проверка годами ничего не находила, плашка появлялась только после ручной.
      const result = await systemService.checkLatestVersion(true)

      if (result.updateAvailable) {
        logger.info(
          `[CheckUpdateJob] Update available: ${result.currentVersion} → ${result.latestVersion}`
        )
      } else {
        await KVStore.setValue('system.updateAvailable', false)
        logger.info(
          `[CheckUpdateJob] System is up to date (${result.currentVersion})`
        )
      }

      return result
    } catch (error) {
      logger.error(`[CheckUpdateJob] Update check failed: ${error.message}`)
      throw error
    }
  }

  static async scheduleNightly() {
    const queueService = QueueService.getInstance()
    const queue = queueService.getQueue(this.queue)

    await queue.upsertJobScheduler(
      'nightly-update-check',
      // «Кладезъ»: каждый час — плашка «Вышла новая версия» появляется не позже чем через час.
      // Один короткий запрос к GitHub в час; о пользователе ничего не отправляется.
      { pattern: '7 * * * *' },
      {
        name: this.key,
        opts: {
          removeOnComplete: { count: 7 },
          removeOnFail: { count: 5 },
        },
      }
    )

    logger.info('[CheckUpdateJob] Update check scheduled with cron: 7 * * * *')
  }

  static async dispatch() {
    const queueService = QueueService.getInstance()
    const queue = queueService.getQueue(this.queue)

    const job = await queue.add(this.key, {}, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 60000 },
      removeOnComplete: { count: 7 },
      removeOnFail: { count: 5 },
    })

    logger.info(`[CheckUpdateJob] Dispatched ad-hoc update check job ${job.id}`)
    return job
  }
}
