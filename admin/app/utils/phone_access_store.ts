import { readFileSync } from 'node:fs'
import KVStore from '#models/kv_store'
import { parseDefaultGateways, parseTrustedList } from './phone_access.js'
import { runningInContainer } from './lan_addresses.js'

/**
 * «Кладезъ»: сведения для проверки «компьютер или телефон», с кешем.
 * Настройку перечитываем не чаще раза в RECHECK_MS; после сохранения — сразу.
 */
const RECHECK_MS = 5_000
let cached: { value: boolean; at: number } | null = null

export async function phonesMayChange(): Promise<boolean> {
  const now = Date.now()
  if (cached && now - cached.at < RECHECK_MS) return cached.value
  let value = false
  try {
    value = (await KVStore.getValue('phones.allowChanges')) === true
  } catch {
    // Нет базы (первый запуск) — телефоны только смотрят.
  }
  cached = { value, at: now }
  return value
}

export function applyPhonesMayChange(value: unknown) {
  cached = { value: value === true || value === 'true', at: Date.now() }
}

let trusted: string[] | null = null

/** Адреса «это компьютер», кроме loopback: шлюз сети Docker контейнера + KLADEZ_TRUSTED_CLIENTS. */
export function trustedComputerAddresses(): string[] {
  if (trusted) return trusted
  let gateways: string[] = []
  try {
    gateways = parseDefaultGateways(readFileSync('/proc/net/route', 'utf8'))
  } catch {
    // Не Linux (разработка на Windows) — только loopback.
  }
  // Шлюз по умолчанию — это и есть адрес docker-proxy только в контейнере. Без Docker (Linux
  // без контейнера) шлюз — это роутер, и доверять ему нельзя.
  const inContainer = runningInContainer()
  trusted = [
    ...(inContainer ? gateways : []),
    ...parseTrustedList(process.env.KLADEZ_TRUSTED_CLIENTS),
  ]
  return trusted
}
