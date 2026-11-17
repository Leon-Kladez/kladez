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
      setInstallActivity((prev) => {
        const entry = {
          service_name: data.service_name ?? 'unknown',
          type: data.status ?? 'unknown',
          timestamp: new Date().toISOString(),
          message: data.message ?? t('install.noMessage'),
        }
        // «Кладезъ»: «скачано N МБ» приходит каждые 2 секунды — обновляем строку, а не копим сотни.
        const last = prev[prev.length - 1]
        if (last && last.service_name === entry.service_name && last.type === entry.type && /pulling$/.test(entry.type)) {
          return [...prev.slice(0, -1), entry]
        }
        return [...prev, entry]
      })
    })

    return () => {
      unsubscribe()
    }
  }, [])

  return installActivity
}
