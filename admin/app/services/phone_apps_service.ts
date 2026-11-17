/**
 * «Кладезъ»: «Карты в дорогу» — приложение Organic Maps для Android, которое телефоны в доме берут
 * прямо с компьютера (по Wi-Fi, без магазина и без интернета).
 *
 * Organic Maps — свободный навигатор на данных OpenStreetMap (Apache 2.0): страны скачиваются в
 * телефон, маршрут по GPS ведёт без интернета. Кладезъ один раз скачивает официальный файл .apk
 * с GitHub организации organicmaps, сверяет его с опубликованной там контрольной суммой (sha256)
 * и хранит в библиотеке: storage/phone-apps/organic-maps.apk и organic-maps.json (версия, размер).
 */
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import { mkdir, readFile, rename, stat, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import logger from '@adonisjs/core/services/logger'
import { parseSha256Sum, pickAndroidRelease } from '../utils/phone_apps.js'

export const ORGANIC_MAPS_RELEASES = 'https://api.github.com/repos/organicmaps/organicmaps/releases?per_page=15'
export const APK_FILE = 'organic-maps.apk'
const META_FILE = 'organic-maps.json'

export type ApkMeta = { version: string; size: number; sha256: string; downloadedAt: string }

type State = { downloading: boolean; received: number; total: number; error: string | null }

export class PhoneAppsService {
  private static state: State = { downloading: false, received: 0, total: 0, error: null }

  static dir(): string {
    return join(process.cwd(), 'storage', 'phone-apps')
  }

  static apkPath(): string {
    return join(this.dir(), APK_FILE)
  }

  static async meta(): Promise<ApkMeta | null> {
    try {
      const m = JSON.parse(await readFile(join(this.dir(), META_FILE), 'utf8'))
      await stat(this.apkPath())
      return m
    } catch {
      return null
    }
  }

  static async status() {
    return { app: await this.meta(), ...this.state }
  }

  /** Скачать (или обновить) приложение в фоне. Повторный вызов во время скачивания ничего не делает. */
  static start(): boolean {
    if (this.state.downloading) return false
    this.state = { downloading: true, received: 0, total: 0, error: null }
    void this.download()
      .catch((err) => {
        logger.warn(`[PhoneApps] Organic Maps: ${err?.message ?? err}`)
        this.state.error = err?.message === 'network' ? 'network' : 'failed'
      })
      .finally(() => {
        this.state.downloading = false
      })
    return true
  }

  private static async download() {
    let releases: any
    try {
      const res = await fetch(ORGANIC_MAPS_RELEASES, {
        headers: { 'Accept': 'application/vnd.github+json', 'User-Agent': 'kladez' },
        signal: AbortSignal.timeout(20000),
      })
      if (!res.ok) throw new Error(`GitHub ${res.status}`)
      releases = await res.json()
    } catch {
      throw new Error('network')
    }
    const release = pickAndroidRelease(releases)
    if (!release) throw new Error('нет выпуска для Android')
    const current = await this.meta()
    if (current?.version === release.version) return

    const sumRes = await fetch(release.sumUrl, { signal: AbortSignal.timeout(20000) })
    const want = parseSha256Sum(await sumRes.text())
    if (!want) throw new Error('нет контрольной суммы')

    await mkdir(this.dir(), { recursive: true })
    const part = `${this.apkPath()}.part`
    const res = await fetch(release.apkUrl, { signal: AbortSignal.timeout(30 * 60 * 1000) })
    if (!res.ok || !res.body) throw new Error(`скачивание: ${res.status}`)
    this.state.total = Number(res.headers.get('content-length')) || release.size
    const hash = createHash('sha256')
    const body = Readable.fromWeb(res.body as any)
    body.on('data', (chunk: Buffer) => {
      hash.update(chunk)
      this.state.received += chunk.length
    })
    await pipeline(body, createWriteStream(part))
    const got = hash.digest('hex')
    if (got !== want) {
      await unlink(part).catch(() => {})
      throw new Error('файл скачался с ошибкой (не сошлась контрольная сумма)')
    }
    await rename(part, this.apkPath())
    const meta: ApkMeta = {
      version: release.version,
      size: (await stat(this.apkPath())).size,
      sha256: got,
      downloadedAt: new Date().toISOString(),
    }
    await writeFile(join(this.dir(), META_FILE), JSON.stringify(meta))
    logger.info(`[PhoneApps] Organic Maps ${meta.version} готов для телефонов`)
  }
}
