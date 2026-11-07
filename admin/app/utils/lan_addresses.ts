/**
 * «Кладезъ»: адрес компьютера в домашней сети — для QR-кода «Открыть на телефоне».
 *
 * Панель живёт в Docker внутри WSL и настоящих адресов Windows не видит. Их при каждом запуске
 * записывает kladez-net.ps1 (Windows) в файл в папке библиотеки — она же /app/storage панели.
 * Нет файла (разработка, Linux) — берём сетевые адаптеры, которые видит сам процесс.
 */
import { existsSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import { networkInterfaces } from 'node:os'
import qrcode from 'qrcode-generator'

export type LanKind = 'wifi' | 'ethernet' | 'other'

export type LanAddress = {
  ip: string
  kind: LanKind
  /** Название адаптера, как его показывает Windows («Беспроводная сеть», «Ethernet»). */
  name: string
}

export type HostNetworkFile = {
  adminPort?: number
  addresses?: Array<{ ip?: unknown; kind?: unknown; name?: unknown }>
  updatedAt?: string
}

export const HOST_NETWORK_FILE =
  process.env.KLADEZ_HOST_NETWORK_FILE || '/app/storage/.kladez-network.json'

/** Частные адреса домашней сети: 10/8, 172.16/12, 192.168/16. */
export function isPrivateIPv4(ip: string): boolean {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(ip)
  if (!m) return false
  const [a, b, c, d] = m.slice(1).map(Number)
  if ([a, b, c, d].some((n) => n > 255)) return false
  if (a === 10) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  return a === 192 && b === 168
}

// Виртуальные адаптеры: WSL/Hyper-V, Docker, VPN, виртуальные машины. С телефона по ним не достучаться.
const VIRTUAL_NAME =
  /(vethernet|hyper-v|wsl|docker|^br-|^veth|^virbr|vmware|virtualbox|vbox|^tun|^tap|^wg|wireguard|wintun|openvpn|tailscale|zerotier|^zt|^utun|vpn|loopback|^lo$|teredo|isatap)/i

function asKind(value: unknown): LanKind {
  return value === 'wifi' || value === 'ethernet' ? value : 'other'
}

const KIND_ORDER: Record<LanKind, number> = { wifi: 0, ethernet: 1, other: 2 }

/** Оставить подходящие адреса без повторов: сначала Wi-Fi, потом кабель. */
export function pickLanAddresses(list: LanAddress[]): LanAddress[] {
  const seen = new Set<string>()
  const out: LanAddress[] = []
  for (const a of list) {
    if (!isPrivateIPv4(a.ip) || seen.has(a.ip) || VIRTUAL_NAME.test(a.name)) continue
    seen.add(a.ip)
    out.push(a)
  }
  return out.sort((x, y) => KIND_ORDER[x.kind] - KIND_ORDER[y.kind])
}

/** Разобрать файл, который пишет kladez-net.ps1. Испорченный файл — пустой список. */
export function parseHostNetworkFile(text: string): {
  addresses: LanAddress[]
  adminPort: number | null
} {
  let data: HostNetworkFile
  try {
    data = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
  } catch {
    return { addresses: [], adminPort: null }
  }
  const raw = Array.isArray(data?.addresses) ? data.addresses : []
  const addresses = pickLanAddresses(
    raw
      .filter((a) => typeof a?.ip === 'string')
      .map((a) => ({
        ip: String(a.ip),
        kind: asKind(a.kind),
        name: typeof a.name === 'string' ? a.name : '',
      }))
  )
  const port = Number(data?.adminPort)
  return { addresses, adminPort: Number.isInteger(port) && port > 0 && port < 65536 ? port : null }
}

function guessKind(name: string): LanKind {
  if (/(wi-?fi|wlan|wireless|беспровод|^wl)/i.test(name)) return 'wifi'
  if (/(ethernet|^eth|^en|^eno|^enp|подключение по локальной)/i.test(name)) return 'ethernet'
  return 'other'
}

/** Адреса, которые видит сам процесс (разработка на Windows, установка на Linux без Docker). */
export function addressesFromInterfaces(
  ifaces: ReturnType<typeof networkInterfaces>
): LanAddress[] {
  const list: LanAddress[] = []
  for (const [name, entries] of Object.entries(ifaces)) {
    for (const e of entries ?? []) {
      if (e.family !== 'IPv4' || e.internal) continue
      list.push({ ip: e.address, kind: guessKind(name), name })
    }
  }
  return pickLanAddresses(list)
}

/** Порт панели: из файла, иначе из URL панели (URL=http://localhost:8080), иначе 8080. */
export function adminPortFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  try {
    const port = Number(new URL(env.URL || '').port)
    if (Number.isInteger(port) && port > 0) return port
  } catch {}
  return 8080
}

export function phoneUrl(ip: string, port: number): string {
  return port === 80 ? `http://${ip}` : `http://${ip}:${port}`
}

/** Панель в Docker: её собственные адаптеры — внутренние адреса Docker, телефону они не годятся. */
export function runningInContainer(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.KLADEZ_IN_DOCKER === '1' || existsSync('/.dockerenv')
}

export async function readLanAddresses(): Promise<{
  addresses: LanAddress[]
  port: number
  fromHost: boolean
}> {
  try {
    const parsed = parseHostNetworkFile(await readFile(HOST_NETWORK_FILE, 'utf8'))
    return {
      addresses: parsed.addresses,
      port: parsed.adminPort ?? adminPortFromEnv(),
      fromHost: true,
    }
  } catch {
    // Нет файла: в Docker адреса компьютера не узнать (покажем «не удалось»), иначе — свои адаптеры.
    return {
      addresses: runningInContainer() ? [] : addressesFromInterfaces(networkInterfaces()),
      port: adminPortFromEnv(),
      fromHost: false,
    }
  }
}

/** QR-код как один SVG-путь: { size, path } — квадраты по клеткам, без внешних сервисов. */
export function qrPath(text: string): { size: number; path: string } {
  const qr = qrcode(0, 'M')
  qr.addData(text)
  qr.make()
  const n = qr.getModuleCount()
  const parts: string[] = []
  for (let row = 0; row < n; row++) {
    for (let col = 0; col < n; col++) {
      if (qr.isDark(row, col)) parts.push(`M${col} ${row}h1v1h-1z`)
    }
  }
  return { size: n, path: parts.join('') }
}
