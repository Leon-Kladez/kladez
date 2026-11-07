/**
 * «Кладезъ»: кто открыл панель — сам компьютер или телефон в домашней сети.
 *
 * Как запросы доходят до панели (она в Docker внутри WSL):
 *  - браузер на самом компьютере → http://localhost:8080 → WSL пересылает его на свой 127.0.0.1 →
 *    docker-proxy → контейнер. Панель видит адрес шлюза своей сети Docker (или 127.0.0.1 в разработке).
 *  - телефон → http://192.168.x.x:8080 → netsh portproxy в Windows → адрес WSL. Панель видит
 *    адрес Windows со стороны WSL (172.x.x.1) — то есть «адрес WSL-хоста» — это путь ТЕЛЕФОНОВ.
 *  - Linux без WSL: телефон приходит со своим настоящим адресом, компьютер — снова через шлюз Docker.
 *
 * Поэтому «компьютер» = loopback или шлюз по умолчанию самого контейнера (его нельзя подделать
 * из домашней сети), плюс адреса из KLADEZ_TRUSTED_CLIENTS. Всё остальное — телефон.
 * Берём адрес сокета, а не X-Forwarded-For: заголовок присылает сам клиент.
 */

/** Убрать IPv4-в-IPv6 (::ffff:1.2.3.4) и зону (%eth0). */
export function normalizeIp(address: string | undefined | null): string {
  if (!address) return ''
  let ip = address.trim().toLowerCase()
  const zone = ip.indexOf('%')
  if (zone !== -1) ip = ip.slice(0, zone)
  if (ip.startsWith('::ffff:') && ip.includes('.')) ip = ip.slice(7)
  return ip
}

export function isLoopback(address: string | undefined | null): boolean {
  const ip = normalizeIp(address)
  return ip === '::1' || /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)
}

/**
 * Шлюзы по умолчанию из /proc/net/route (адреса в шестнадцатеричном виде, младший байт первым).
 * Для контейнера это адрес, с которого docker-proxy пересылает запросы с localhost компьютера.
 */
export function parseDefaultGateways(procNetRoute: string): string[] {
  const out: string[] = []
  for (const line of procNetRoute.split(/\r?\n/).slice(1)) {
    const cols = line.trim().split(/\s+/)
    if (cols.length < 3) continue
    const [, destination, gateway] = cols
    if (destination !== '00000000' || !/^[0-9A-Fa-f]{8}$/.test(gateway) || gateway === '00000000')
      continue
    const bytes = [6, 4, 2, 0].map((i) => Number.parseInt(gateway.slice(i, i + 2), 16))
    const ip = bytes.join('.')
    if (!out.includes(ip)) out.push(ip)
  }
  return out
}

/** Список адресов из переменной окружения («1.2.3.4, 5.6.7.8»). */
export function parseTrustedList(value: string | undefined): string[] {
  return (value ?? '')
    .split(/[\s,;]+/)
    .map((s) => normalizeIp(s))
    .filter(Boolean)
}

/** Запрос пришёл с самого компьютера. */
export function isComputerClient(
  remoteAddress: string | undefined | null,
  trusted: readonly string[]
): boolean {
  if (isLoopback(remoteAddress)) return true
  const ip = normalizeIp(remoteAddress)
  return ip !== '' && trusted.map(normalizeIp).includes(ip)
}

const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])

/**
 * Что телефону можно, кроме чтения: живые обновления страницы и разговор с ИИ-помощником.
 * Удалять переписку, менять настройки, ставить и удалять программы, качать — нельзя.
 */
const PHONE_WRITE_ALLOWLIST: ReadonlyArray<{ method: string; path: RegExp }> = [
  { method: 'POST', path: /^\/__transmit\/(subscribe|unsubscribe)$/ },
  { method: 'POST', path: /^\/api\/ollama\/chat$/ },
  { method: 'POST', path: /^\/api\/ollama\/unload-chat-models$/ },
  { method: 'POST', path: /^\/api\/chat\/sessions$/ },
  { method: 'PUT', path: /^\/api\/chat\/sessions\/[^/]+$/ },
  { method: 'POST', path: /^\/api\/chat\/sessions\/[^/]+\/messages$/ },
]

/** Запрос, который телефон может делать и в режиме «только смотреть». */
export function isReadOnlySafe(method: string, path: string): boolean {
  const m = method.toUpperCase()
  if (READ_METHODS.has(m)) return true
  const clean = (path.split('?')[0] || '/').replace(/\/+$/, '') || '/'
  return PHONE_WRITE_ALLOWLIST.some((rule) => rule.method === m && rule.path.test(clean))
}

export type DeviceAccess = {
  /** Запрос с самого компьютера. */
  isComputer: boolean
  /** Можно ли с этого устройства что-то менять. */
  canChange: boolean
}

export function deviceAccess(isComputer: boolean, phonesMayChange: boolean): DeviceAccess {
  return { isComputer, canChange: isComputer || phonesMayChange }
}

/** Пропустить ли запрос. */
export function isRequestAllowed(access: DeviceAccess, method: string, path: string): boolean {
  return access.canChange || isReadOnlySafe(method, path)
}

/** Код ошибки в ответе 403 — по нему интерфейс узнаёт «только смотреть». */
export const PHONE_READ_ONLY_CODE = 'phone_read_only'
