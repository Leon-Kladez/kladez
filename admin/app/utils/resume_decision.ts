/**
 * Kladez: should a failed download be restarted now that the internet is back?
 *
 * A download that used up all 10 attempts during a long outage is not broken —
 * it was waiting for the network. It is retried (resuming its .tmp) unless the
 * failure is permanent: the user cancelled, the server sent a non-ZIM page, or
 * every mirror said the file is gone. Very old failures are left alone.
 */
const PERMANENT = [/^Download cancelled/i, /MIME type .* is not allowed/i, /all mirrors returned 404/i]
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000

export function shouldResumeFailedDownload(info: {
  failedReason: string
  unrecoverable: boolean
  /** The person chose something else, or another job already writes this file. */
  superseded: boolean
  tmpBytes: number | null
  finishedOn: number
  now: number
}): boolean {
  if (info.unrecoverable || info.superseded) return false
  if (PERMANENT.some((re) => re.test(info.failedReason ?? ''))) return false
  return info.now - info.finishedOn < MAX_AGE_MS
}
