/**
 * Kladez: «сторож сети» для обращений к внешним адресам (каталог на GitHub,
 * каталог Kiwix). Наш главный случай — интернета нет, поэтому:
 *  - после неудачи сеть не дёргаем COOLDOWN_MS (по умолчанию 12 минут) —
 *    сразу отвечаем «нет сети», без ожидания таймаута;
 *  - попытки идут по одной: если первая не удалась, остальные в очереди
 *    получают «нет сети» мгновенно, а не ждут каждая свой таймаут;
 *  - короткий таймаут — NETWORK_TIMEOUT_MS (5 с).
 */
export const NETWORK_TIMEOUT_MS = 5_000
/**
 * Когда человек сам нажал «Обновить список»: ждём дольше (медленный интернет — тоже интернет;
 * список карт с GitHub бывает и 6–10 с) и не смотрим на паузу после прошлой неудачи.
 */
export const MANUAL_TIMEOUT_MS = 30_000
export const OFFLINE_COOLDOWN_MS = 12 * 60_000

export class OfflineError extends Error {
  readonly offline = true
  constructor(readonly gate: string, readonly cause?: unknown) {
    super(`${gate}: no network (retry later)`)
    this.name = 'OfflineError'
  }
}

export function isOfflineError(error: unknown): error is OfflineError {
  return error instanceof OfflineError || (error as { offline?: unknown } | null)?.offline === true
}

export class OfflineGate {
  private downUntil = 0
  private lastError: unknown = null
  private queue: Promise<unknown> = Promise.resolve()

  constructor(
    readonly name: string,
    private readonly cooldownMs = OFFLINE_COOLDOWN_MS,
    private readonly now: () => number = Date.now
  ) {}

  /** Недавно была неудача — сеть пока не трогаем. */
  isDown(): boolean {
    return this.now() < this.downUntil
  }

  /** Последняя ошибка сети (для журнала), пока сторож «закрыт». */
  get error(): unknown {
    return this.isDown() ? this.lastError : null
  }

  markDown(error: unknown): void {
    this.downUntil = this.now() + this.cooldownMs
    this.lastError = error
  }

  markUp(): void {
    this.downUntil = 0
    this.lastError = null
  }

  /**
   * Выполнить сетевую попытку. Пока сторож «закрыт» — сразу OfflineError.
   * Любая ошибка fn закрывает сторож на cooldown и пробрасывается дальше.
   */
  run<T>(fn: () => Promise<T>, opts: { force?: boolean } = {}): Promise<T> {
    const attempt = async (): Promise<T> => {
      // force — попытка по просьбе человека: пауза после неудачи её не останавливает.
      if (this.isDown() && !opts.force) throw new OfflineError(this.name, this.lastError)
      try {
        const result = await fn()
        this.markUp()
        return result
      } catch (error) {
        this.markDown(error)
        throw error
      }
    }
    const result = this.queue.then(attempt, attempt)
    this.queue = result.catch(() => undefined)
    return result
  }
}

/** Каталог «Кладезя» (collections-ru на GitHub или KLADEZ_CATALOG_BASE_URL). */
export const catalogGate = new OfflineGate('catalog')
/** Онлайн-каталог Kiwix (opds.library.kiwix.org). */
export const kiwixGate = new OfflineGate('kiwix')
