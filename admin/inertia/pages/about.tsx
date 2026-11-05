import { Head, Link, usePage } from '@inertiajs/react'
import AppLayout from '~/layouts/AppLayout'
import { UsePageProps } from '../../types/system'
import { t } from '../../constants/i18n'

export default function About() {
  const { appVersion } = usePage().props as unknown as UsePageProps
  return (
    <AppLayout>
      <Head title={t('about.title')} />
      <div className="mx-auto max-w-2xl space-y-4 p-6 text-text-primary">
        <h2 className="text-2xl font-semibold">{t('about.title')}</h2>
        <p>{t('about.intro')}</p>
        <p className="text-text-secondary">{t('about.version', { version: appVersion })}</p>
        <p>{t('about.basedOn')}</p>
        <Link href="/settings/legal" className="text-desert-green underline">
          {t('about.legalLink')}
        </Link>
      </div>
    </AppLayout>
  )
}
