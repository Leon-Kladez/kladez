import { Head } from '@inertiajs/react'
import { IconBug, IconExternalLink, IconShare, IconStar } from '@tabler/icons-react'
import SettingsLayout from '~/layouts/SettingsLayout'
import { KLADEZ_ISSUES_URL, KLADEZ_PROJECT_URL } from '../../../constants/kladez'
import { t } from '../../../constants/i18n'

/**
 * «Кладезъ»: «Как помочь «Кладезъ»» — вместо апстримного «Поддержать проект».
 * Без денег, рекламы, чужих ссылок и картинок из сети.
 */
function Way({
  icon,
  title,
  text,
  href,
  linkText,
}: {
  icon: React.ReactNode
  title: string
  text: string
  href?: string
  linkText?: string
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
    </section>
  )
}

export default function SupportPage() {
  return (
    <SettingsLayout>
      <Head title={t('nav.settings.support')} />
      <div className="xl:pl-72 w-full">
        <main className="px-4 sm:px-12 py-6 max-w-4xl">
          <h1 className="text-4xl font-semibold mb-4">{t('nav.settings.support')}</h1>
          <p className="text-text-muted mb-10 text-lg">{t('support.intro')}</p>

          <Way
            icon={<IconShare className="size-7 shrink-0" aria-hidden="true" />}
            title={t('support.share')}
            text={t('support.shareText')}
          />
          <Way
            icon={<IconBug className="size-7 shrink-0" aria-hidden="true" />}
            title={t('support.report')}
            text={t('support.reportText')}
            href={KLADEZ_ISSUES_URL}
            linkText={t('support.reportLink')}
          />
          <Way
            icon={<IconStar className="size-7 shrink-0" aria-hidden="true" />}
            title={t('support.star')}
            text={t('support.starText')}
            href={KLADEZ_PROJECT_URL}
            linkText={t('support.starLink')}
          />

          <p className="text-sm text-text-muted mb-4">{t('support.offlineNote')}</p>
          <p className="text-sm text-text-muted">{t('support.basedOn')}</p>
        </main>
      </div>
    </SettingsLayout>
  )
}
