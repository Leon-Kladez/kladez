import { useState } from 'react'
import classNames from 'classnames'
import { IconLanguage } from '@tabler/icons-react'
import api from '~/lib/api'
import { useNotifications } from '~/context/NotificationContext'
import { getLocale, LANGUAGE_HEADING, LOCALE_NAMES, SUPPORTED_LOCALES, t, type Locale } from '../../constants/i18n'

/**
 * Переключатель языка интерфейса. Язык хранится на сервере (ui.language) —
 * один на все устройства в доме. Названия языков всегда на своём языке.
 * После смены страница перезагружается целиком: так весь интерфейс, включая
 * тексты, вычисленные при загрузке модулей, сразу на новом языке.
 */
export default function LanguageSwitcher({ size = 'normal' }: { size?: 'normal' | 'large' }) {
  const { addNotification } = useNotifications()
  const [pending, setPending] = useState<Locale | null>(null)
  const current = getLocale()

  async function choose(locale: Locale) {
    if (locale === current || pending) return
    setPending(locale)
    const result = await api.updateSetting('ui.language', locale)
    if (result?.success) {
      window.location.reload()
      return
    }
    setPending(null)
    addNotification({ type: 'error', message: t('language.saveFailed') })
  }

  const large = size === 'large'
  return (
    <div role="radiogroup" aria-label={LANGUAGE_HEADING} className="flex flex-wrap gap-3">
      {SUPPORTED_LOCALES.map((locale) => {
        const selected = locale === current
        return (
          <button
            key={locale}
            type="button"
            role="radio"
            aria-checked={selected}
            lang={locale}
            disabled={pending !== null}
            onClick={() => choose(locale)}
            className={classNames(
              'flex items-center gap-2 rounded-lg border-2 font-semibold transition-colors',
              large ? 'px-6 py-3 text-xl' : 'px-4 py-2 text-base',
              selected
                ? 'border-desert-green bg-desert-green text-white'
                : 'border-border-subtle bg-surface-primary text-text-primary hover:border-desert-green',
              pending === locale && 'opacity-70'
            )}
          >
            <IconLanguage className={large ? 'size-6' : 'size-5'} aria-hidden="true" />
            {LOCALE_NAMES[locale]}
          </button>
        )
      })}
    </div>
  )
}
