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
