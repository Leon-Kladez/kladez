import KVStore from '#models/kv_store'
import { parseUiMode, type UiMode } from './ui_mode.js'

/** Режим из настроек с коротким кешем; после сохранения настройки — сразу. */
const RECHECK_MS = 5_000
let cached: { value: UiMode; hintSeen: boolean; at: number } | null = null

export async function storedUiMode(): Promise<{ mode: UiMode; hintSeen: boolean }> {
  const now = Date.now()
  if (!cached || now - cached.at >= RECHECK_MS) {
    let value: UiMode = parseUiMode(null)
    let hintSeen = false
    try {
      value = parseUiMode(await KVStore.getValue('ui.mode'))
      hintSeen = (await KVStore.getValue('ui.advancedHintSeen')) === true
    } catch {
      // Нет базы (первый запуск) — обычный режим.
    }
    cached = { value, hintSeen, at: now }
  }
  return { mode: cached.value, hintSeen: cached.hintSeen }
}

export function invalidateUiMode() {
  cached = null
}
