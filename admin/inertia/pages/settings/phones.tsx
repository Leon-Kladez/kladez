import { useState } from 'react'
import { Head } from '@inertiajs/react'
import SettingsLayout from '~/layouts/SettingsLayout'
import StyledSectionHeader from '~/components/StyledSectionHeader'
import Switch from '~/components/inputs/Switch'
import OpenOnPhone from '~/components/phones/OpenOnPhone'
import api from '~/lib/api'
import { useNotifications } from '~/context/NotificationContext'
import { useDevice } from '~/hooks/useDevice'
import { t } from '../../../constants/i18n'

/** «Кладезъ»: Настройки → Телефоны. QR-код и разрешение телефонам что-то менять. */
export default function PhonesSettingsPage(props: { allowChanges: boolean }) {
  const { addNotification } = useNotifications()
  const { isComputer } = useDevice()
  const [allowChanges, setAllowChanges] = useState(props.allowChanges)
  const [saving, setSaving] = useState(false)

  async function toggle(next: boolean) {
    setSaving(true)
    const result = await api.updateSetting('phones.allowChanges', next)
    setSaving(false)
    if (result?.success) {
      setAllowChanges(next)
      addNotification({ type: 'success', message: t('phones.settings.saved') })
    } else {
      addNotification({ type: 'error', message: t('phones.settings.saveFailed') })
    }
  }

  return (
    <SettingsLayout>
      <Head title={t('phones.nav')} />
      <div className="xl:pl-72 w-full min-w-0">
        <main className="px-4 sm:px-12 py-6 max-w-4xl">
          <h1 className="text-4xl font-semibold mb-4">{t('phones.nav')}</h1>
          <p className="text-text-muted mb-6 text-lg">{t('phones.settings.intro')}</p>

          <OpenOnPhone />

          <StyledSectionHeader title={t('phones.settings.accessTitle')} className="mt-8 mb-4" />
          <div className="bg-surface-primary rounded-lg border-2 border-border-subtle p-4 sm:p-6">
            <Switch
              id="phones-allow-changes"
              checked={allowChanges}
              onChange={toggle}
              disabled={saving || !isComputer}
              label={t('phones.settings.allowLabel')}
              description={t('phones.settings.allowDescription')}
            />
            {!isComputer && (
              <p className="text-sm font-semibold mt-2">{t('phones.settings.computerOnly')}</p>
            )}
          </div>
        </main>
      </div>
    </SettingsLayout>
  )
}
