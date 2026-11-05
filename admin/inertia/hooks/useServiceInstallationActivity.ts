import { useEffect, useState } from 'react'
import { useTransmit } from 'react-adonis-transmit'
import { InstallActivityFeedProps } from '~/components/InstallActivityFeed'
import { BROADCAST_CHANNELS } from '../../constants/broadcast'
import { t } from '../../constants/i18n'

export default function useServiceInstallationActivity() {
  const { subscribe } = useTransmit()
  const [installActivity, setInstallActivity] = useState<InstallActivityFeedProps['activity']>([])

  useEffect(() => {
    const unsubscribe = subscribe(BROADCAST_CHANNELS.SERVICE_INSTALLATION, (data: any) => {
      setInstallActivity((prev) => [
        ...prev,
        {
          service_name: data.service_name ?? 'unknown',
          type: data.status ?? 'unknown',
          timestamp: new Date().toISOString(),
          message: data.message ?? t('install.noMessage'),
        },
      ])
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return installActivity
}
