/**
 * Kladez: a 401/403 means "this build lacks the entitlement key" only when we
 * actually sent credentials. A public mirror refusing a plain request (geo-block,
 * UA policy) is an ordinary error, so the job rotates to the next mirror.
 */
export function isGatedAuthFailure(
  status: number | undefined,
  requestHeaders: Record<string, string> | undefined
): boolean {
  return (status === 401 || status === 403) && !!requestHeaders?.Authorization
}
