import { usePage } from '@inertiajs/react'

export type UiModeProps = { mode: 'simple' | 'advanced'; hintSeen: boolean; canSwitch: boolean }

/**
 * «Кладезъ»: «Обычный» или «Продвинутый» режим панели. Решает сервер (настройка
 * ui.mode; телефонам, которые только смотрят, — всегда обычный).
 */
export function useUiMode(): UiModeProps & { isSimple: boolean } {
  const { uiMode } = usePage<{ uiMode?: UiModeProps }>().props
  const value = uiMode ?? { mode: 'simple', hintSeen: false, canSwitch: true }
  return { ...value, isSimple: value.mode !== 'advanced' }
}
