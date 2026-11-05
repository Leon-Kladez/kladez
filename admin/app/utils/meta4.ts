import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { XMLParser } from 'fast-xml-parser'

/**
 * Kladez: Kiwix publishes `<file>.meta4` (Metalink) next to every ZIM, with the
 * size and SHA-256. A download glued together across several resumes and
 * mirrors is checked against it before Kiwix ever sees the file.
 */
export function parseMeta4(xml: string): { sha256?: string; size?: number } {
  try {
    const doc = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '' }).parse(xml)
    const file = doc?.metalink?.file
    if (!file) return {}
    const out: { sha256?: string; size?: number } = {}
    const size = Number(file.size)
    if (Number.isFinite(size) && size > 0) out.size = size
    const hashes = Array.isArray(file.hash) ? file.hash : file.hash ? [file.hash] : []
    const sha = hashes.find((h: any) => h?.type === 'sha-256')?.['#text']
    if (typeof sha === 'string' && /^[0-9a-f]{64}$/i.test(sha.trim())) out.sha256 = sha.trim().toLowerCase()
    return out
  } catch {
    return {}
  }
}

export function sha256File(path: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256')
    createReadStream(path)
      .on('data', (chunk) => hash.update(chunk))
      .on('error', reject)
      .on('end', () => resolve(hash.digest('hex')))
  })
}

/**
 * Kladez: the SHA-256 a finished download must have. A hash already in the job
 * wins. For Kiwix ZIMs the `.meta4` is asked from the address in the job (the
 * main server, which generates it), never from the mirror that served the
 * bytes — mirrors return 404 for `.meta4`. No hash → the check is skipped.
 */
export async function resolveExpectedSha256(
  params: { url: string; filetype: string; expectedSha256?: string },
  fetchText: (url: string) => Promise<string>
): Promise<string | undefined> {
  if (params.expectedSha256) return params.expectedSha256.toLowerCase()
  if (params.filetype !== 'zim' || !params.url.includes('/zim/')) return undefined
  try {
    return parseMeta4(await fetchText(`${params.url}.meta4`)).sha256
  } catch {
    return undefined
  }
}
