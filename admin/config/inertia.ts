import KVStore from '#models/kv_store'
import { SystemService } from '#services/system_service'
import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import { getLocale, t } from '../constants/i18n/index.js'
import { resolveDeviceAccess } from '../app/middleware/phone_access_middleware.js'
import { effectiveUiMode } from '../app/utils/ui_mode.js'
import { storedUiMode } from '../app/utils/ui_mode_store.js'
import app from '@adonisjs/core/services/app'
import { cachedBriefSources } from '../app/utils/brief.js'

let _assistantNameCache: { value: string; expiresAt: number } | null = null

export function invalidateAssistantNameCache() {
  _assistantNameCache = null
}

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    appVersion: () => SystemService.getAppVersion(),
    environment: process.env.NODE_ENV || 'production',
    // Язык уже прочитан из настроек в locale_middleware.
    locale: () => getLocale(),
    // «Кладезъ»: компьютер или телефон, можно ли менять (телефоны по умолчанию только смотрят).
    device: (ctx) => resolveDeviceAccess(ctx),
    // «Кладезъ»: приветственный ролик — адреса файлов, если они лежат в public/brief.
    brief: () => cachedBriefSources(app.publicPath('brief')),
    // «Кладезъ»: «Обычный» / «Продвинутый» режим; телефонам, которые только смотрят, — обычный.
    uiMode: async (ctx) => {
      const [{ mode, hintSeen }, device] = await Promise.all([storedUiMode(), resolveDeviceAccess(ctx)])
      return { mode: effectiveUiMode(mode, device.canChange), hintSeen, canSwitch: device.canChange }
    },
    aiAssistantName: async () => {
      const now = Date.now()
      if (_assistantNameCache && now < _assistantNameCache.expiresAt) {
        return _assistantNameCache.value
      }
      const customName = await KVStore.getValue('ai.assistantCustomName')
      const value = (customName && customName.trim()) ? customName : t('services.nomad_ollama.title')
      _assistantNameCache = { value, expiresAt: now + 60_000 }
      return value
    },
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx'
  }
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}