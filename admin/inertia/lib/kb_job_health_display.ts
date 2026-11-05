import { computeJobHealth, type JobHealthStatus } from '../../app/utils/kb_job_health.js'
import { t } from '../../constants/i18n/index.js'

export { computeJobHealth, type JobHealthStatus } from '../../app/utils/kb_job_health.js'

/**
 * Visual presentation for each health status — pill color, dot color, and the
 * short label rendered alongside the dot. Kept in one place so backend health
 * decisions (`computeJobHealth`) and frontend rendering stay in sync.
 */
export const JOB_HEALTH_DISPLAY: Record<
  JobHealthStatus,
  { dot: string; label: string; ariaLabel: string }
> = {
  waiting: {
    dot: 'bg-gray-400 dark:bg-gray-500',
    label: t('kb.health.waiting'),
    ariaLabel: t('kb.health.waitingHint'),
  },
  healthy: {
    dot: 'bg-green-500',
    label: t('kb.health.active'),
    ariaLabel: t('kb.health.activeHint'),
  },
  slow: {
    dot: 'bg-yellow-500',
    label: t('kb.health.slow'),
    ariaLabel: t('kb.health.slowHint'),
  },
  stalled: {
    dot: 'bg-red-500',
    label: t('kb.health.stalled'),
    ariaLabel: t('kb.health.stalledHint'),
  },
  failed: {
    dot: 'bg-red-700',
    label: t('kb.health.failed'),
    ariaLabel: t('kb.health.failedHint'),
  },
}

/**
 * Format a relative timestamp as "Xs ago", "Xm ago", "Xh ago" with sensible
 * thresholds for the KB Processing Queue's "Last activity" line.
 */
export function formatTimeAgo(timestampMs: number, now: number): string {
  const seconds = Math.max(0, Math.floor((now - timestampMs) / 1000))
  if (seconds < 5) return t('time.justNow')
  if (seconds < 60) return t('time.secondsAgo', { n: seconds })
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return t('time.minutesAgo', { n: minutes })
  const hours = Math.floor(minutes / 60)
  return t('time.hoursAgo', { n: hours })
}

/**
 * Convenience wrapper that resolves a job's health status without the caller
 * having to remember to pass `now`. Mostly for ergonomic frontend use.
 */
export function computeJobHealthNow(
  input: Omit<Parameters<typeof computeJobHealth>[0], 'now'>
): JobHealthStatus {
  return computeJobHealth({ ...input, now: Date.now() })
}
