import { rename, rm } from 'node:fs/promises'

/**
 * Kladez: turn a finished `.tmp` into the final file only after it passed
 * verification. Kiwix (and every library rebuild) only looks at `*.zim`, so an
 * unverified or corrupt download is never visible to it. On failure the `.tmp`
 * is deleted, so the retry starts clean instead of re-renaming bad bytes.
 */
export async function finalizeTmp(
  tmpPath: string,
  finalPath: string,
  verify?: (tmpPath: string) => Promise<void>
): Promise<void> {
  if (verify) {
    try {
      await verify(tmpPath)
    } catch (error) {
      await rm(tmpPath, { force: true })
      throw error
    }
  }
  await rename(tmpPath, finalPath)
}
