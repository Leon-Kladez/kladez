import { Job } from 'bullmq'
import logger from '@adonisjs/core/services/logger'
import { QueueService } from '#services/queue_service'
import { RunDownloadJob } from './run_download_job.js'
import { shouldResumeFailedDownload } from '../utils/resume_decision.js'
import { getFileStatsIfExists } from '../utils/fs.js'
import { isWikipediaMainFile } from '../utils/wikipedia_file.js'
import { basename } from 'node:path'
import type { RunDownloadJobParams } from '../../types/downloads.js'

/**
 * Kladez: every 10 minutes, if the internet is back, restart downloads that
 * failed while it was gone. job.retry() resets BullMQ's attempt counter, so the
 * download gets its 10 attempts and its mirror rotation again, resuming the .tmp.
 */
export class ResumeDownloadsJob {
  static get queue() {
    return 'system'
  }

  static get key() {
    return 'resume-failed-downloads'
  }

  async handle(_job: Job) {
    const { SystemService } = await import('#services/system_service')
    const { DockerService } = await import('#services/docker_service')
    const online = await new SystemService(new DockerService()).getInternetStatus().catch(() => false)
    if (!online) return { resumed: 0, reason: 'offline' }

    const queue = QueueService.getInstance().getQueue(RunDownloadJob.queue)
    const failed = await queue.getFailed()
    const now = Date.now()
    // Files another job is already writing — reviving a second writer would
    // append to the same .tmp.
    const busyPaths = new Set(
      (await queue.getJobs(['active', 'waiting', 'delayed'])).map((j) => (j.data as RunDownloadJobParams)?.filepath)
    )
    // The Wikipedia the person currently wants; an older failed choice stays dead.
    const { default: WikipediaSelection } = await import('#models/wikipedia_selection')
    const wantedWikipedia = (await WikipediaSelection.query().first())?.filename ?? null
    let resumed = 0
    for (const job of failed) {
      const data = job.data as RunDownloadJobParams
      const tmp = data?.filepath ? await getFileStatsIfExists(`${data.filepath}.tmp`) : null
      const resume = shouldResumeFailedDownload({
        failedReason: job.failedReason ?? '',
        // UnrecoverableError fails a job before its attempts are used up.
        unrecoverable: job.attemptsMade < (job.opts.attempts ?? 1),
        superseded:
          busyPaths.has(data?.filepath) ||
          (isWikipediaMainFile(data?.url ?? '') && basename(data?.filepath ?? '') !== wantedWikipedia),
        tmpBytes: tmp ? Number(tmp.size) : null,
        finishedOn: job.finishedOn ?? now,
        now,
      })
      if (!resume) continue
      try {
        await job.retry('failed', { resetAttemptsMade: true, resetAttemptsStarted: true })
        resumed++
        logger.info(`[ResumeDownloadsJob] Resumed ${data.url}`)
      } catch (error: any) {
        logger.warn(`[ResumeDownloadsJob] Could not resume ${job.id}: ${error?.message}`)
      }
    }
    return { resumed, reason: 'online' }
  }

  static async schedule() {
    const queue = QueueService.getInstance().getQueue(this.queue)
    await queue.upsertJobScheduler(
      'resume-failed-downloads',
      { pattern: '*/10 * * * *' },
      { name: this.key, opts: { removeOnComplete: { count: 6 }, removeOnFail: { count: 5 } } }
    )
  }
}
