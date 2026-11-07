/**
 * «Кладезъ»: память и диски самого компьютера с Windows.
 *
 * Панель работает в отсеке WSL и видит только его долю памяти (по умолчанию Windows даёт
 * отсеку половину) и его виртуальный диск («overlay», ~1 ТБ). Настоящие цифры пишет
 * kladez-net.ps1 в тот же файл, что и адреса для телефонов (.kladez-network.json).
 */
import { readFile } from 'node:fs/promises'
import { HOST_NETWORK_FILE } from './lan_addresses.js'

export type HostDisk = { name: string; sizeBytes: number; freeBytes: number }
export type HostInfo = { memoryBytes: number | null; disks: HostDisk[] }

const EMPTY: HostInfo = { memoryBytes: null, disks: [] }

function positive(value: unknown): number | null {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseHostInfo(text: string): HostInfo {
  let data: any
  try {
    data = JSON.parse(text.charCodeAt(0) === 0xfeff ? text.slice(1) : text)
  } catch {
    return EMPTY
  }
  const disks: HostDisk[] = []
  for (const d of Array.isArray(data?.disks) ? data.disks : []) {
    const size = positive(d?.sizeBytes)
    const free = Number(d?.freeBytes)
    if (typeof d?.name !== 'string' || !/^[A-Za-z]:$/.test(d.name) || !size) continue
    if (!Number.isFinite(free) || free < 0) continue
    disks.push({ name: d.name.toUpperCase(), sizeBytes: size, freeBytes: Math.min(free, size) })
  }
  return { memoryBytes: positive(data?.memoryBytes), disks }
}

export async function readHostInfo(file = HOST_NETWORK_FILE): Promise<HostInfo> {
  try {
    return parseHostInfo(await readFile(file, 'utf8'))
  } catch {
    return EMPTY
  }
}
