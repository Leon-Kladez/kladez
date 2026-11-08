import { Head } from '@inertiajs/react'
import { useState } from 'react'
import { IconBug, IconExternalLink, IconHeart, IconShare, IconStar } from '@tabler/icons-react'
import SettingsLayout from '~/layouts/SettingsLayout'
import {
  KLADEZ_DOWNLOAD_URL,
  KLADEZ_ISSUES_URL,
  KLADEZ_PROJECT_URL,
  KLADEZ_REPO_PUBLIC,
  KLADEZ_THANKS_URL,
} from '../../../constants/kladez'
import { t } from '../../../constants/i18n'

/**
 * «Кладезъ»: «Как помочь «Кладезъ»» — вместо апстримного «Поддержать проект».
 * Без рекламы и чужих картинок из сети. Ссылки на GitHub — только когда репозиторий
 * открыт всем (KLADEZ_REPO_PUBLIC). «Поблагодарить» — только если автор положил QR
 * в public/thanks/ (сервер передаёт thanksQr).
 */
function Way({
  icon,
  title,
  text,
  href,
  linkText,
  children,
}: {
  icon: React.ReactNode
  title: string
  text: string
  href?: string
  linkText?: string
  children?: React.ReactNode
}) {
  return (
    <section className="mb-8 bg-surface-primary rounded-lg border-2 border-border-subtle p-6">
      <h2 className="flex items-center gap-2 text-2xl font-semibold mb-3">
        {icon}
        {title}
      </h2>
      <p className="text-text-secondary">{text}</p>
      {href && linkText && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 text-desert-green font-semibold hover:underline"
        >
          {linkText}
          <IconExternalLink size={16} aria-hidden="true" />
        </a>
      )}
      {children}
    </section>
  )
}

function shareMessage(downloadUrl: string): string {
  return downloadUrl ? `${t('support.shareMessage')}\n${downloadUrl}` : t('support.shareMessage')
}

/**
 * Телефон — системное «Поделиться» (WhatsApp, Telegram, почта…). Компьютер —
 * копируем текст. Если браузер не даёт ни того ни другого (телефон по адресу
 * http://192.168…, не «безопасная» страница) — показываем текст, чтобы скопировать руками.
 */
function ShareButton() {
  const [state, setState] = useState<'idle' | 'copied' | 'manual'>('idle')
  const message = shareMessage(KLADEZ_DOWNLOAD_URL)

  async function onShare() {
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: 'Кладезъ', text: message })
        return
      }
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
        setState('copied')
        return
      }
    } catch (err) {
      // Человек закрыл окно «Поделиться» — это не ошибка.
      if (err instanceof DOMException && err.name === 'AbortError') return
    }
    setState('manual')
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        onClick={onShare}
        className="inline-flex items-center gap-2 rounded-md bg-desert-green px-4 py-2 font-semibold text-white hover:opacity-90"
      >
        <IconShare size={18} aria-hidden="true" />
        {t('support.shareButton')}
      </button>
      {state === 'copied' && (
        <p className="mt-3 text-sm text-desert-green" role="status">
          {t('support.shareCopied')}
        </p>
      )}
      {state === 'manual' && (
        <div className="mt-3">
          <p className="text-sm text-text-secondary mb-2">{t('support.shareManual')}</p>
          <textarea
            readOnly
            value={message}
            rows={4}
            onFocus={(e) => e.currentTarget.select()}
            className="w-full rounded-md border border-border-subtle bg-surface-secondary p-2 text-sm"
          />
        </div>
      )}
    </div>
  )
}

export default function SupportPage({ thanksQr }: { thanksQr?: string | null }) {
  return (
    <SettingsLayout>
      <Head title={t('nav.settings.support')} />
      <div className="xl:pl-72 w-full">
        <main className="px-4 sm:px-12 py-6">
          <h1 className="text-4xl font-semibold mb-4">{t('nav.settings.support')}</h1>
          <p className="text-text-muted mb-10 text-lg max-w-4xl">{t('support.intro')}</p>

          <div className="flex flex-col lg:flex-row gap-8 items-start">
            <div className="w-full max-w-4xl">
              {KLADEZ_REPO_PUBLIC && (
                <Way
                  icon={<IconStar className="size-7 shrink-0" aria-hidden="true" />}
                  title={t('support.star')}
                  text={t('support.starText')}
                  href={KLADEZ_PROJECT_URL}
                  linkText={t('support.starLink')}
                />
              )}
              <Way
                icon={<IconShare className="size-7 shrink-0" aria-hidden="true" />}
                title={t('support.share')}
                text={t('support.shareText')}
              >
                <ShareButton />
              </Way>
              {KLADEZ_REPO_PUBLIC && (
                <>
                  <Way
                    icon={<IconBug className="size-7 shrink-0" aria-hidden="true" />}
                    title={t('support.report')}
                    text={t('support.reportText')}
                    href={KLADEZ_ISSUES_URL}
                    linkText={t('support.reportLink')}
                  />
                  <p className="text-sm text-text-muted mb-4">{t('support.offlineNote')}</p>
                </>
              )}
              <p className="text-sm text-text-muted">{t('support.basedOn')}</p>
            </div>

            <aside className="w-full lg:w-80 shrink-0 bg-surface-primary rounded-lg border-2 border-border-subtle p-6 lg:sticky lg:top-6">
              <h2 className="flex items-center gap-2 text-2xl font-semibold mb-3">
                <IconHeart className="size-7 shrink-0 text-desert-orange" aria-hidden="true" />
                {t('support.thanks')}
              </h2>
              <p className="text-text-secondary mb-4">{t('support.thanksText')}</p>
              {thanksQr ? (
                <img
                  src={thanksQr}
                  alt={t('support.thanksQrAlt')}
                  className="mx-auto w-full max-w-64 rounded-md bg-white p-2"
                />
              ) : (
                // Пока автор не положил QR в public/thanks/ — заглушка на месте кода.
                <div className="mx-auto flex aspect-square w-full max-w-64 items-center justify-center rounded-md border-2 border-dashed border-border-subtle p-4 text-center text-text-muted">
                  {t('support.thanksQrSoon')}
                </div>
              )}
              {/* С телефона QR-код на своём же экране не навести — даём ссылку. */}
              {KLADEZ_THANKS_URL && (
                <a
                  href={KLADEZ_THANKS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-4 inline-flex items-center gap-2 text-desert-green font-semibold hover:underline"
                >
                  {t('support.thanksLink')}
                  <IconExternalLink size={16} aria-hidden="true" />
                </a>
              )}
            </aside>
          </div>
        </main>
      </div>
    </SettingsLayout>
  )
}
