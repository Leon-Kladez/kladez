import { useEffect, useState } from 'react'
import { IconRefresh } from '@tabler/icons-react'
import { t } from '../../constants/i18n'
import { isNewerServerVersion } from '~/lib/version_check'

/**
 * «Кладезъ»: страница открыта давно, а Кладезъ за это время обновился — старая страница
 * показывает старое (так было с моделями ИИ после 0.1.27). Раз в минуту сверяем версию;
 * изменилась — плашка внизу «Кладезъ обновился — обновите страницу».
 */
export default function UpdatedBanner({ pageVersion }: { pageVersion: string }) {
  const [newVersion, setNewVersion] = useState<string | null>(null)

  useEffect(() => {
    let stopped = false
    const check = async () => {
      try {
        const res = await fetch('/api/health', { cache: 'no-store' })
        if (!res.ok) return
        const data = (await res.json()) as { version?: string }
        if (!stopped && isNewerServerVersion(pageVersion, data.version)) setNewVersion(data.version!)
      } catch {
        // Кладезъ перезапускается (как раз обновляется) — проверим в следующий раз.
      }
    }
    const id = window.setInterval(check, 60_000)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => {
      stopped = true
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
    }
  }, [pageVersion])

  if (!newVersion) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 bottom-4 z-[60] mx-auto flex w-[min(36rem,calc(100vw-2rem))] items-center gap-3 rounded-lg border border-desert-green bg-surface-primary px-4 py-3 text-text-primary shadow-lg"
    >
      <p className="flex-1 text-sm">{t('updated.banner', { version: newVersion })}</p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-desert-green px-3 py-2 text-sm font-semibold text-white hover:brightness-110"
      >
        <IconRefresh size={16} aria-hidden="true" />
        {t('updated.reload')}
      </button>
    </div>
  )
}
