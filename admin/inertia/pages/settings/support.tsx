import { Head } from '@inertiajs/react'
import { IconExternalLink } from '@tabler/icons-react'
import SettingsLayout from '~/layouts/SettingsLayout'
import { t } from '../../../constants/i18n'

export default function SupportPage() {
  return (
    <SettingsLayout>
      <Head title={t('nav.settings.support')} />
      <div className="xl:pl-72 w-full">
        <main className="px-12 py-6 max-w-4xl">
          <h1 className="text-4xl font-semibold mb-4">{t('nav.settings.support')}</h1>
          <p className="text-text-muted mb-10 text-lg">
            {t('support.intro')}
          </p>

          {/* Ko-fi */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-3">{t('support.coffee')}</h2>
            <p className="text-text-muted mb-4">
              {t('support.coffeeText')}
            </p>
            <a
              href="https://ko-fi.com/crosstalk"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#FF5E5B] hover:bg-[#e54e4b] text-white font-semibold rounded-lg transition-colors"
            >
              {t('support.kofi')}
              <IconExternalLink size={18} />
            </a>
          </section>

          {/* Rogue Support */}
          <section className="mb-12">
            <h2 className="text-2xl font-semibold mb-3">{t('support.network')}</h2>
            <a
              href="https://rogue.support"
              target="_blank"
              rel="noopener noreferrer"
              className="block mb-4 rounded-lg overflow-hidden hover:opacity-90 transition-opacity"
            >
              <img
                src="/rogue-support-banner.webp"
                alt={t('support.rogueAlt')}
                className="w-full"
              />
            </a>
            <p className="text-text-muted mb-4">
              {t('support.rogueText')}
            </p>
            <a
              href="https://rogue.support"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-blue-600 hover:underline font-medium"
            >
              {t('support.rogueVisit')}
              <IconExternalLink size={16} />
            </a>
          </section>

          {/* Other Ways to Help */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-3">{t('support.other')}</h2>
            <ul className="space-y-2 text-text-muted">
              <li>
                <a
                  href="https://github.com/Crosstalk-Solutions/project-nomad"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {t('support.star')}
                </a>
                {' '}{t('support.starText')}
              </li>
              <li>
                <a
                  href="https://github.com/Crosstalk-Solutions/project-nomad/issues"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {t('support.report')}
                </a>
                {' '}{t('support.reportText')}
              </li>
              <li>{t('support.share')}</li>
              <li>
                <a
                  href="https://discord.com/invite/crosstalksolutions"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {t('support.discord')}
                </a>
                {' '}{t('support.discordText')}
              </li>
            </ul>
          </section>

        </main>
      </div>
    </SettingsLayout>
  )
}
