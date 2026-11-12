// Кладезъ: маршруты по карте без интернета. Программа маршрутов — Valhalla (служебная, ставится
// по кнопке), граф дорог — файлы routes-<регион>_<версия>.tar из kladez-maps, распакованные в
// storage/maps/routes/tiles. Наборы регионов собраны из ОДНОЙ сборки на всю страну, поэтому
// кусочки на границах одинаковые — регионы складываются в одну папку без порчи.
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { installedPacks, installedRegions, installPack, removePack, ROUTES_FILE_RE } from '../utils/route_packs.js'
import Service from '#models/service'
import { DockerService } from '#services/docker_service'
import { SERVICE_NAMES } from '../../constants/service_names.js'
import { getLocale } from '../../constants/i18n/index.js'
import {
  parseValhallaRoute,
  routeErrorKey,
  valhallaRouteRequest,
  type RouteMode,
  type RoutePoint,
  type RouteResult,
} from '../utils/map_route.js'

export const ROUTES_DIR = '/storage/maps/routes'
export { ROUTES_FILE_RE }

/** Запуск программы маршрутов: настройки создаются при первом запуске, дальше — как есть. */
export const START_SCRIPT = `#!/bin/bash
# Кладезъ: запуск программы маршрутов (Valhalla). Файл пишет панель — правки затрутся.
set -e
mkdir -p /data/tiles
if [ ! -s /data/valhalla.json ]; then
  valhalla_build_config \\
    --mjolnir-tile-dir /data/tiles \\
    --mjolnir-tile-extract /data/no-extract.tar \\
    --mjolnir-admin /data/tiles/admins.sqlite \\
    --mjolnir-timezone /data/tiles/timezones.sqlite \\
    > /data/valhalla.json.tmp
  mv /data/valhalla.json.tmp /data/valhalla.json
fi
exec valhalla_service /data/valhalla.json 2
`

export class RouteError extends Error {
  constructor(public key: string) {
    super(key)
  }
}

export class MapRouteService {
  static dir(): string {
    return join(process.cwd(), ROUTES_DIR)
  }

  static tilesDir(): string {
    return join(this.dir(), 'tiles')
  }

  static packsDir(): string {
    return join(this.dir(), 'packs')
  }

  /** Папка и скрипт запуска — перед установкой программы и при каждом старте панели. */
  static async prepare(): Promise<void> {
    await mkdir(this.tilesDir(), { recursive: true })
    await mkdir(this.packsDir(), { recursive: true })
    const script = join(this.dir(), 'start.sh')
    let current = ''
    try {
      current = await readFile(script, 'utf8')
    } catch {}
    if (current !== START_SCRIPT) await writeFile(script, START_SCRIPT, { mode: 0o755 })
  }

  /** Регионы, дороги которых распакованы (по спискам файлов в packs/). */
  static async installedRegions(): Promise<string[]> {
    return installedRegions(this.packsDir())
  }

  /** Установленные наборы с версией и отпечатком — чтобы узнать, вышли ли новые дороги. */
  static async installedPacks() {
    return installedPacks(this.packsDir())
  }

  static async serviceState(): Promise<'none' | 'installing' | 'installed'> {
    const s = await Service.query().where('service_name', SERVICE_NAMES.ROUTES).first()
    if (!s) return 'none'
    if (s.installed) return 'installed'
    return s.installation_status === 'installing' ? 'installing' : 'none'
  }

  /** Поставить программу маршрутов (скачивается ~240 МБ). */
  static async installService(docker: DockerService): Promise<{ success: boolean; message: string }> {
    await this.prepare()
    if ((await this.serviceState()) !== 'none') return { success: true, message: 'already' }
    return docker.createContainerPreflight(SERVICE_NAMES.ROUTES)
  }

  /** Распаковать скачанный файл дорог региона в общую папку (сам .tar удаляется). */
  static async installPack(tarPath: string) {
    await this.prepare()
    return installPack(tarPath, this.tilesDir(), this.packsDir())
  }

  /** Убрать дороги региона: только кусочки, которых нет у других установленных регионов. */
  static async removePack(region: string): Promise<number> {
    return removePack(region, this.tilesDir(), this.packsDir())
  }

  /** Перезапустить программу маршрутов, чтобы она увидела новые дороги. */
  static async reload(docker: DockerService): Promise<void> {
    if ((await this.serviceState()) === 'installed') await docker.affectContainer(SERVICE_NAMES.ROUTES, 'restart')
  }

  static async route(docker: DockerService, from: RoutePoint, to: RoutePoint, mode: RouteMode): Promise<RouteResult> {
    const url = await docker.getServiceURL(SERVICE_NAMES.ROUTES)
    if (!url) throw new RouteError('routes.notInstalled')
    const language = getLocale() === 'en' ? 'en-US' : 'ru-RU'
    let res: Response
    try {
      res = await fetch(`${url}/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(valhallaRouteRequest(from, to, mode, language)),
        signal: AbortSignal.timeout(60000),
      })
    } catch {
      throw new RouteError('routes.notRunning')
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) throw new RouteError(routeErrorKey(body))
    try {
      return parseValhallaRoute(body, mode)
    } catch {
      throw new RouteError('routes.noRoad')
    }
  }

  /** Сколько места занимают дороги (для страницы управления картами). */
  static async diskBytes(): Promise<number> {
    let total = 0
    const walk = async (d: string): Promise<void> => {
      let names: string[] = []
      try {
        names = await readdir(d)
      } catch {
        return
      }
      for (const n of names) {
        const p = join(d, n)
        const s = await stat(p).catch(() => null)
        if (!s) continue
        if (s.isDirectory()) await walk(p)
        else total += s.size
      }
    }
    await walk(this.tilesDir())
    return total
  }
}

