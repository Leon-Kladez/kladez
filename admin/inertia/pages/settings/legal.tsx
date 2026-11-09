import { Head } from '@inertiajs/react'
import SettingsLayout from '~/layouts/SettingsLayout'
import { t, tIn, type MessageKey } from '../../../constants/i18n'

const THIRD_PARTY: Array<{ name: string; key: MessageKey; url: string }> = [
  { name: 'Kiwix', key: 'legal.thirdParty.kiwix', url: 'https://kiwix.org' },
  { name: 'Kolibri', key: 'legal.thirdParty.kolibri', url: 'https://learningequality.org/kolibri' },
  { name: 'Ollama', key: 'legal.thirdParty.ollama', url: 'https://ollama.com' },
  { name: 'CyberChef', key: 'legal.thirdParty.cyberchef', url: 'https://github.com/gchq/CyberChef' },
  { name: 'FlatNotes', key: 'legal.thirdParty.flatnotes', url: 'https://github.com/dullage/flatnotes' },
  { name: 'Qdrant', key: 'legal.thirdParty.qdrant', url: 'https://github.com/qdrant/qdrant' },
]

const linkClass = 'text-blue-600 hover:underline break-all'

export default function LegalPage({ libraryPath }: { libraryPath?: string }) {
  return (
    <SettingsLayout>
      <Head title={t('nav.settings.legal')} />
      <div className="xl:pl-72 w-full">
        <main className="px-12 py-6 max-w-4xl">
          <h1 className="text-4xl font-semibold mb-8">{t('nav.settings.legal')}</h1>

          {/* Кладезъ — производная работа */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.kladez.title')}</h2>
            <p className="text-text-primary mb-3">{t('legal.kladez.text')}</p>
            <p className="text-text-primary">
              <a href="https://github.com/Crosstalk-Solutions/project-nomad" target="_blank" rel="noopener noreferrer" className={linkClass}>https://github.com/Crosstalk-Solutions/project-nomad</a>
            </p>
          </section>

          {/* License Agreement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.license.title')}</h2>
            <p className="text-text-primary mb-3">Copyright 2024-2026 Crosstalk Solutions, LLC</p>
            <p className="text-text-primary mb-3">{t('legal.license.p1')}</p>
            <p className="text-text-primary mb-3">
              <a href="https://www.apache.org/licenses/LICENSE-2.0" target="_blank" rel="noopener noreferrer" className={linkClass}>https://www.apache.org/licenses/LICENSE-2.0</a>
            </p>
            <p className="text-text-primary mb-3">{t('legal.license.p2')}</p>
            <p className="text-sm text-text-muted mb-2">{t('legal.license.officialNote')}</p>
            <blockquote lang="en" className="border-l-4 border-border-subtle pl-3 text-sm text-text-muted space-y-2">
              <p>{tIn('en', 'legal.license.p1')}</p>
              <p>{tIn('en', 'legal.license.p2')}</p>
            </blockquote>
          </section>

          {/* Third-Party Software */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.thirdParty.title')}</h2>
            <p className="text-text-primary mb-4">{t('legal.thirdParty.intro')}</p>
            <ul className="space-y-3 text-text-primary">
              {THIRD_PARTY.map((item) => (
                <li key={item.name}>
                  <strong>{item.name}</strong> — {t(item.key)}
                  <br />
                  <a href={item.url} target="_blank" rel="noopener noreferrer" className={linkClass}>{item.url}</a>
                </li>
              ))}
            </ul>
          </section>

          {/* Kladez: music of the installer and of the «Brief» video */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.media.title')}</h2>
            <p className="text-text-primary">{t('legal.media.text')}</p>
          </section>

          {/* Privacy Statement */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.privacy.title')}</h2>
            <p className="text-text-primary mb-3">{t('legal.privacy.intro')}</p>
            <ul className="list-disc list-inside space-y-2 text-text-primary">
              <li><strong>{t('legal.privacy.telemetryTitle')}</strong> {t('legal.privacy.telemetry')}</li>
              <li><strong>{t('legal.privacy.localTitle')}</strong> {t('legal.privacy.local')}</li>
              <li><strong>{t('legal.privacy.accountsTitle')}</strong> {t('legal.privacy.accounts')}</li>
              <li><strong>{t('legal.privacy.networkTitle')}</strong> {t('legal.privacy.network')}</li>
            </ul>
          </section>

          {/* Content Disclaimer */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.content.title')}</h2>
            <p className="text-text-primary mb-3">{t('legal.content.p1')}</p>
            <p className="text-text-primary mb-3">{t('legal.content.p2')}</p>
            <p className="text-text-primary">{t('legal.content.p3')}</p>
          </section>

          {/* Medical Disclaimer */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.medical.title')}</h2>
            <p className="text-text-primary mb-3">{t('legal.medical.p1')}</p>
            <p className="text-text-primary mb-3 font-semibold">{t('legal.medical.notSubstitute')}</p>
            <ul className="list-disc list-inside space-y-2 text-text-primary mb-3">
              <li>{t('legal.medical.l1')}</li>
              <li>{t('legal.medical.l2')}</li>
              <li>{t('legal.medical.l3')}</li>
              <li>{t('legal.medical.l4')}</li>
            </ul>
          </section>

          {/* Data Storage Notice */}
          <section className="mb-10">
            <h2 className="text-2xl font-semibold mb-4">{t('legal.storage.title')}</h2>
            <p className="text-text-primary mb-3">{t('legal.storage.intro')}</p>
            <ul className="list-disc list-inside space-y-2 text-text-primary">
              <li>
                <strong>{t('legal.storage.contentDir')}</strong>{' '}
                {libraryPath ? <code className="break-all">{libraryPath}</code> : t('legal.storage.contentDirFallback')}
              </li>
              <li><strong>{t('legal.storage.appData')}</strong> {t('legal.storage.appDataText')}</li>
            </ul>
            <p className="text-text-primary mt-3">{t('legal.storage.control')}</p>
          </section>
        </main>
      </div>
    </SettingsLayout>
  )
}
