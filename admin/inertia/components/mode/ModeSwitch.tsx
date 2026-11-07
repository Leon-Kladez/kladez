import { useState } from 'react'
import classNames from 'classnames'
import { router } from '@inertiajs/react'
import { IconAlertTriangle } from '@tabler/icons-react'
import api from '~/lib/api'
import { useNotifications } from '~/context/NotificationContext'
import { useUiMode } from '~/hooks/useUiMode'
import { t } from '../../../constants/i18n'

type Mode = 'simple' | 'advanced'

async function saveMode(mode: Mode, markHintSeen: boolean): Promise<boolean> {
  const result = await api.updateSetting('ui.mode', mode)
  if (!result?.success) return false
  if (markHintSeen) await api.updateSetting('ui.advancedHintSeen', true)
  return true
}

/** Одна кнопка режима: стоит слева или справа от логотипа в шапке главной. */
function ModeButton({
  mode,
  current,
  busy,
  onChoose,
}: {
  mode: Mode
  current: Mode
  busy: boolean
  onChoose: (mode: Mode) => void
}) {
  const selected = mode === current
  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      disabled={busy}
      title={t(mode === 'simple' ? 'mode.simpleHint' : 'mode.advancedHint')}
      onClick={(e) => {
        e.stopPropagation()
        onChoose(mode)
      }}
      className={classNames(
        'rounded-full border-2 px-3 py-1.5 text-sm sm:px-5 sm:py-2 sm:text-base font-semibold transition-colors whitespace-nowrap',
        selected
          ? 'border-desert-green bg-desert-green text-white'
          : 'border-border-default bg-surface-primary text-text-secondary hover:border-desert-green hover:text-text-primary'
      )}
    >
      {t(mode === 'simple' ? 'mode.simple' : 'mode.advanced')}
    </button>
  )
}

/**
 * «Кладезъ»: шапка главной — «Обычный» слева от логотипа, «Продвинутый» справа.
 * При первом переходе в продвинутый режим под шапкой — подсказка.
 */
export default function ModeSwitch({ logo }: { logo: React.ReactNode }) {
  const { mode, hintSeen, canSwitch } = useUiMode()
  const { addNotification } = useNotifications()
  const [busy, setBusy] = useState(false)
  const [showHint, setShowHint] = useState(false)

  if (!canSwitch) return <>{logo}</>

  async function choose(next: Mode) {
    if (next === mode || busy) return
    setBusy(true)
    const firstAdvanced = next === 'advanced' && !hintSeen
    const ok = await saveMode(next, firstAdvanced)
    setBusy(false)
    if (!ok) {
      addNotification({ type: 'error', message: t('mode.saveFailed') })
      return
    }
    setShowHint(firstAdvanced)
    router.reload()
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div role="radiogroup" aria-label={t('mode.label')} className="flex items-center justify-center gap-2 sm:gap-6 max-w-full">
        <ModeButton mode="simple" current={mode} busy={busy} onChoose={choose} />
        <div className="min-w-0 shrink">{logo}</div>
        <ModeButton mode="advanced" current={mode} busy={busy} onChoose={choose} />
      </div>
      {showHint && mode === 'advanced' && (
        <div
          role="status"
          className="mt-3 mx-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 rounded-lg border-2 border-desert-orange bg-surface-primary px-4 py-3 text-text-primary"
          onClick={(e) => e.stopPropagation()}
        >
          <IconAlertTriangle className="size-6 shrink-0 text-desert-orange" aria-hidden="true" />
          <p className="flex-1">
            <span className="font-semibold">{t('mode.hint.title')}.</span> {t('mode.hint.text')}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowHint(false)}
              className="rounded border border-border-default px-3 py-1 text-sm hover:bg-surface-secondary"
            >
              {t('mode.hint.ok')}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowHint(false)
                choose('simple')
              }}
              className="rounded bg-desert-green px-3 py-1 text-sm text-white hover:brightness-110"
            >
              {t('mode.hint.back')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
