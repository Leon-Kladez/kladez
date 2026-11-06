/**
 * Kladez: каталог отдаём сразу из того, что есть на месте, а обновление из
 * сети — в фоне. Порядок: сохранённая копия (БД) → встроенная копия
 * (collections-ru в образе) → только если обеих нет, ждём сеть.
 */
export type SpecSources<T> = {
  readCache: () => Promise<T | null>
  loadBundled: () => Promise<T | null>
  /** Обновить сохранённую копию из сети; true — если удалось. */
  fetchFromNetwork: () => Promise<boolean>
}

/** Не чаще раза в REFRESH_INTERVAL_MS на каждый вид каталога (при удаче). */
export const REFRESH_INTERVAL_MS = 60 * 60_000

export class BackgroundRefresher {
  private lastStarted = new Map<string, number>()
  private inFlight = new Map<string, Promise<boolean>>()

  constructor(
    private readonly intervalMs = REFRESH_INTERVAL_MS,
    private readonly now: () => number = Date.now
  ) {}

  /** Запустить обновление в фоне, если оно давно не шло и сейчас не идёт. Не ждёт сеть. */
  kick(key: string, fetch: () => Promise<boolean>, canTry: () => boolean = () => true): void {
    if (this.inFlight.has(key) || !canTry()) return
    const last = this.lastStarted.get(key)
    if (last !== undefined && this.now() - last < this.intervalMs) return
    this.lastStarted.set(key, this.now())
    const run = fetch()
      .catch(() => false)
      .then((ok) => {
        // Неудача не должна блокировать следующую попытку на целый час —
        // частоту неудач ограничивает сторож сети (offline_gate).
        if (!ok) this.lastStarted.delete(key)
        return ok
      })
      .finally(() => this.inFlight.delete(key))
    this.inFlight.set(key, run)
  }

  /** Для тестов и для «Обновить» в интерфейсе: дождаться текущего обновления. */
  pending(key: string): Promise<boolean> | undefined {
    return this.inFlight.get(key)
  }
}

export async function specWithFallback<T>(
  key: string,
  sources: SpecSources<T>,
  refresher: BackgroundRefresher,
  canTryNetwork: () => boolean = () => true
): Promise<T | null> {
  const cached = await sources.readCache()
  if (cached) {
    refresher.kick(key, sources.fetchFromNetwork, canTryNetwork)
    return cached
  }
  const bundled = await sources.loadBundled()
  if (bundled) {
    refresher.kick(key, sources.fetchFromNetwork, canTryNetwork)
    return bundled
  }
  // Ни сохранённой, ни встроенной копии — остаётся только сеть.
  if (canTryNetwork() && (await sources.fetchFromNetwork().catch(() => false))) {
    return sources.readCache()
  }
  return null
}
