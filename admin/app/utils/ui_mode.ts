/**
 * «Кладезъ»: режим панели. «Обычный» (simple) — главная из простых плиток без
 * программ, портов и опасных кнопок; «Продвинутый» (advanced) — всё как в NOMAD.
 * Один режим на весь дом (KV `ui.mode`), по умолчанию — обычный. Телефоны,
 * которым нельзя ничего менять, всегда видят обычный режим.
 */
export const UI_MODES = ['simple', 'advanced'] as const
export type UiMode = (typeof UI_MODES)[number]
export const DEFAULT_UI_MODE: UiMode = 'simple'

/** Любое значение → режим; незнакомое или пустое → обычный. */
export function parseUiMode(value: unknown): UiMode {
  return value === 'advanced' ? 'advanced' : DEFAULT_UI_MODE
}

/** Режим для этого устройства: тем, кто только смотрит, — всегда обычный. */
export function effectiveUiMode(stored: unknown, canChange: boolean): UiMode {
  return canChange ? parseUiMode(stored) : DEFAULT_UI_MODE
}
