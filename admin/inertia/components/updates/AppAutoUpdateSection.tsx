import StyledSectionHeader from '~/components/StyledSectionHeader'
import Switch from '~/components/inputs/Switch'
import api from '~/lib/api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useNotifications } from '~/context/NotificationContext'
import { useAppAutoUpdateStatus } from '~/hooks/useAppAutoUpdateStatus'
import { t, formatDateTime } from '../../../constants/i18n'

export default function AppAutoUpdateSection() {
  const { addNotification } = useNotifications()
  const queryClient = useQueryClient()
  const { data: status, isLoading } = useAppAutoUpdateStatus()

  const enabled = status?.enabled ?? false

  const toggleMutation = useMutation({
    mutationFn: (value: boolean) => api.updateSetting('appAutoUpdate.enabled', value),
    onSuccess: (_data, value) => {
      queryClient.invalidateQueries({ queryKey: ['app-auto-update-status'] })
      addNotification({
        type: 'success',
        message: value ? t('autoUpdate.app.enabled') : t('autoUpdate.app.disabled'),
      })
    },
    onError: () => {
      addNotification({ type: 'error', message: t('autoUpdate.app.saveFailed') })
    },
  })

  return (
    <>
      <StyledSectionHeader title={t('autoUpdate.app.title')} className="mt-8" />
      <div className="bg-surface-primary rounded-lg border shadow-md overflow-hidden mt-6 p-6">
        <Switch
          checked={enabled}
          onChange={(value) => toggleMutation.mutate(value)}
          disabled={toggleMutation.isPending || isLoading}
          label={t('autoUpdate.app.enableLabel')}
          description={t('autoUpdate.app.enableDescription')}
        />

        {enabled && status && (
          <div className="mt-6 pt-4 border-t border-desert-stone-light text-sm">
            <p className="text-desert-stone mb-3">
              <span className="font-medium">{t('autoUpdate.windowLabel')}</span>
              {t('autoUpdate.app.windowSummary', {
                start: status.windowStart,
                end: status.windowEnd,
                state: status.withinWindow ? t('autoUpdate.app.inside') : t('autoUpdate.app.outside'),
                hours: status.cooloffHours,
              })}
              {status.lastResult && (
                <>
                  {' '}
                  <span className="font-medium">{t('autoUpdate.app.lastRun')}</span>
                  {status.lastResult}
                  {status.lastAttemptAt
                    ? ` (${formatDateTime(status.lastAttemptAt)})`
                    : ''}
                </>
              )}
            </p>

            {status.apps.length === 0 ? (
              <p className="text-desert-stone-dark">
                {t('autoUpdate.app.noneOptedIn')}
              </p>
            ) : (
              <ul className="space-y-2">
                {status.apps.map((app) => (
                  <li
                    key={app.service_name}
                    className="flex items-start justify-between gap-4 rounded-md bg-surface-secondary px-3 py-2"
                  >
                    <div>
                      <p className="font-medium text-text-primary">
                        {app.friendly_name || app.service_name}
                      </p>
                      <p className="text-desert-stone">
                        {app.current_version}
                        {app.available_update_version
                          ? ` → ${app.available_update_version}`
                          : t('autoUpdate.app.upToDate')}
                      </p>
                      {app.auto_disabled_reason && (
                        <p className="text-desert-red mt-0.5">{app.auto_disabled_reason}</p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        app.eligible ? 'text-desert-green' : 'text-desert-stone'
                      }`}
                    >
                      {app.reason}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </>
  )
}
