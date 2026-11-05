import { Head } from '@inertiajs/react'
import StyledTable from '~/components/StyledTable'
import SettingsLayout from '~/layouts/SettingsLayout'
import { ServiceSlim } from '../../../types/services'
import { getServiceLink } from '~/lib/navigation'
import StyledButton from '~/components/StyledButton'
import { useModals } from '~/context/ModalContext'
import StyledModal from '~/components/StyledModal'
import api from '~/lib/api'
import { useEffect, useState } from 'react'
import InstallActivityFeed from '~/components/InstallActivityFeed'
import LoadingSpinner from '~/components/LoadingSpinner'
import useErrorNotification from '~/hooks/useErrorNotification'
import useInternetStatus from '~/hooks/useInternetStatus'
import useServiceInstallationActivity from '~/hooks/useServiceInstallationActivity'
import { useTransmit } from 'react-adonis-transmit'
import { BROADCAST_CHANNELS } from '../../../constants/broadcast'
import { IconArrowUp, IconCheck, IconDownload } from '@tabler/icons-react'
import UpdateServiceModal from '~/components/UpdateServiceModal'
import { tx } from '~/lib/tx'
import { t } from '../../../constants/i18n'

function extractTag(containerImage: string): string {
  if (!containerImage) return ''
  const parts = containerImage.split(':')
  return parts.length > 1 ? parts[parts.length - 1] : 'latest'
}

export default function SettingsPage(props: { system: { services: ServiceSlim[] } }) {
  const { openModal, closeAllModals } = useModals()
  const { showError } = useErrorNotification()
  const { isOnline } = useInternetStatus()
  const { subscribe } = useTransmit()
  const installActivity = useServiceInstallationActivity()

  const [isInstalling, setIsInstalling] = useState(false)
  const [loading, setLoading] = useState(false)
  const [checkingUpdates, setCheckingUpdates] = useState(false)
  // Services with an update in flight. Seeded optimistically on click so the button disables
  // instantly, and reconciled with the durable `installation_status` from the server so the
  // disabled state survives a page reload or a second open tab while the pull runs.
  const [updatingServices, setUpdatingServices] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (installActivity.length === 0) return
    if (
      installActivity.some(
        (activity) => activity.type === 'completed' || activity.type === 'update-complete'
      )
    ) {
      setTimeout(() => {
        window.location.reload()
      }, 3000)
    }
  }, [installActivity])

  // Listen for service update check completion
  useEffect(() => {
    const unsubscribe = subscribe(BROADCAST_CHANNELS.SERVICE_UPDATES, () => {
      setCheckingUpdates(false)
      window.location.reload()
    })
    return () => { unsubscribe() }
  }, [])

  async function handleCheckUpdates() {
    try {
      if (!isOnline) {
        showError(t('apps.needInternetUpdates'))
        return
      }
      setCheckingUpdates(true)
      const response = await api.checkServiceUpdates()
      if (!response?.success) {
        throw new Error(t('apps.checkDispatchFailed'))
      }
    } catch (error) {
      console.error('Error checking for updates:', error)
      showError(t('apps.checkFailed', { error: error.message || t('common.unknownError') }))
      setCheckingUpdates(false)
    }
  }

  const handleInstallService = (service: ServiceSlim) => {
    openModal(
      <StyledModal
        title={t('apps.installTitle')}
        onConfirm={() => {
          installService(service.service_name)
          closeAllModals()
        }}
        onCancel={closeAllModals}
        open={true}
        confirmText={t('common.install')}
        cancelText={t('common.cancel')}
        confirmVariant="primary"
        icon={<IconDownload className="h-12 w-12 text-desert-green" />}
      >
        <p className="text-text-primary">
          {t('apps.installQuestion', { name: service.friendly_name || service.service_name })}
        </p>
      </StyledModal>,
      'install-service-modal'
    )
  }

  async function installService(serviceName: string) {
    try {
      if (!isOnline) {
        showError(t('apps.needInternetInstall'))
        return
      }

      setIsInstalling(true)
      const response = await api.installService(serviceName)
      if (!response) {
        throw new Error(t('apps.installInternal'))
      }
      if (!response.success) {
        throw new Error(response.message)
      }
    } catch (error) {
      console.error('Error installing service:', error)
      showError(t('apps.installFailed', { error: error.message || t('common.unknownError') }))
    } finally {
      setIsInstalling(false)
    }
  }

  async function handleAffectAction(record: ServiceSlim, action: 'start' | 'stop' | 'restart') {
    try {
      setLoading(true)
      const response = await api.affectService(record.service_name, action)
      if (!response) {
        throw new Error(t('apps.affectInternal'))
      }
      if (!response.success) {
        throw new Error(response.message)
      }

      closeAllModals()

      setTimeout(() => {
        setLoading(false)
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error(`Error affecting service ${record.service_name}:`, error)
      showError(t(`apps.affectFailed.${action}` as const, { error: error.message || t('common.unknownError') }))
    }
  }

  async function handleForceReinstall(record: ServiceSlim) {
    try {
      setLoading(true)
      const response = await api.forceReinstallService(record.service_name)
      if (!response) {
        throw new Error(t('apps.reinstallInternal'))
      }
      if (!response.success) {
        throw new Error(response.message)
      }

      closeAllModals()

      setTimeout(() => {
        setLoading(false)
        window.location.reload()
      }, 3000)
    } catch (error) {
      console.error(`Error force reinstalling service ${record.service_name}:`, error)
      showError(t('apps.reinstallFailed', { error: error.message || t('common.unknownError') }))
    }
  }

  function handleUpdateService(record: ServiceSlim) {
    const currentTag = extractTag(record.container_image)
    const latestVersion = record.available_update_version!

    openModal(
      <UpdateServiceModal
        record={record}
        currentTag={currentTag}
        latestVersion={latestVersion}
        onCancel={closeAllModals}
        onUpdate={async (targetVersion: string) => {
          closeAllModals()
          // Mark this service as updating instead of showing the fullscreen spinner, so the table
          // and the activity feed stay visible (the feed streams live pull/stop/start progress)
          // while the button shows "Updating..." and is disabled.
          setUpdatingServices((prev) => new Set(prev).add(record.service_name))
          try {
            const response = await api.updateService(record.service_name, targetVersion)
            if (!response?.success) {
              throw new Error(response?.message || 'Update failed')
            }
            // On success the backend broadcasts `update-complete`, which triggers the reload effect
            // above and refreshes the version + status. Leave the button disabled until then.
          } catch (error) {
            console.error(`Error updating service ${record.service_name}:`, error)
            showError(t('apps.updateFailed', { error: error.message || t('common.unknownError') }))
            setUpdatingServices((prev) => {
              const next = new Set(prev)
              next.delete(record.service_name)
              return next
            })
          }
        }}
        showError={showError}
      />,
      `${record.service_name}-update-modal`
    )
  }

  const AppActions = ({ record }: { record: ServiceSlim }) => {
    const ForceReinstallButton = () => (
      <StyledButton
        icon="IconDownload"
        variant="action"
        onClick={() => {
          openModal(
            <StyledModal
              title={t('apps.forceReinstallTitle')}
              onConfirm={() => handleForceReinstall(record)}
              onCancel={closeAllModals}
              open={true}
              confirmText={t('apps.forceReinstall')}
              cancelText={t('common.cancel')}
            >
              <p className="text-text-primary">
                {tx('apps.forceReinstallQuestion', {
                  name: record.service_name,
                  wipe: <strong>{t('apps.wipeAllData')}</strong>,
                })}
              </p>
            </StyledModal>,
            `${record.service_name}-force-reinstall-modal`
          )
        }}
        disabled={isInstalling}
      >
        {t('apps.forceReinstall')}
      </StyledButton>
    )

    if (!record) return null
    if (!record.installed) {
      return (
        <div className="flex flex-wrap gap-2">
          <StyledButton
            icon={'IconDownload'}
            variant="primary"
            onClick={() => handleInstallService(record)}
            disabled={isInstalling || !isOnline}
            loading={isInstalling}
          >
            {t('common.install')}
          </StyledButton>
          <ForceReinstallButton />
        </div>
      )
    }

    return (
      <div className="flex flex-wrap gap-2">
        <StyledButton
          icon={'IconExternalLink'}
          onClick={() => {
            window.open(getServiceLink(record.ui_location || 'unknown', record.custom_url), '_blank')
          }}
        >
          {t('common.open')}
        </StyledButton>
        {record.available_update_version && (() => {
          const isUpdating =
            updatingServices.has(record.service_name) || record.installation_status === 'installing'
          return (
            <StyledButton
              icon="IconArrowUp"
              variant="primary"
              onClick={() => handleUpdateService(record)}
              disabled={isInstalling || !isOnline || isUpdating}
              loading={isUpdating}
            >
              {isUpdating ? t('common.updating') : t('common.update')}
            </StyledButton>
          )
        })()}
        {record.status && record.status !== 'unknown' && (
          <>
            <StyledButton
              icon={record.status === 'running' ? 'IconPlayerStop' : 'IconPlayerPlay'}
              variant={record.status === 'running' ? 'action' : undefined}
              onClick={() => {
                openModal(
                  <StyledModal
                    title={record.status === 'running' ? t('apps.stopTitle') : t('apps.startTitle')}
                    onConfirm={() =>
                      handleAffectAction(record, record.status === 'running' ? 'stop' : 'start')
                    }
                    onCancel={closeAllModals}
                    open={true}
                    confirmText={record.status === 'running' ? t('common.stop') : t('common.start')}
                    cancelText={t('common.cancel')}
                  >
                    <p className="text-text-primary">
                      {record.status === 'running'
                        ? t('apps.stopQuestion', { name: record.service_name })
                        : t('apps.startQuestion', { name: record.service_name })}
                    </p>
                  </StyledModal>,
                  `${record.service_name}-affect-modal`
                )
              }}
              disabled={isInstalling}
            >
              {record.status === 'running' ? t('common.stop') : t('common.start')}
            </StyledButton>
            {record.status === 'running' && (
              <StyledButton
                icon="IconRefresh"
                variant="action"
                onClick={() => {
                  openModal(
                    <StyledModal
                      title={t('apps.restartTitle')}
                      onConfirm={() => handleAffectAction(record, 'restart')}
                      onCancel={closeAllModals}
                      open={true}
                      confirmText={t('common.restart')}
                      cancelText={t('common.cancel')}
                    >
                      <p className="text-text-primary">
                        {t('apps.restartQuestion', { name: record.service_name })}
                      </p>
                    </StyledModal>,
                    `${record.service_name}-affect-modal`
                  )
                }}
                disabled={isInstalling}
              >
                {t('common.restart')}
              </StyledButton>
            )}
            <ForceReinstallButton />
          </>
        )}
      </div>
    )
  }

  return (
    <SettingsLayout>
      <Head title={t('apps.pageTitle')} />
      <div className="xl:pl-72 w-full">
        <main className="px-12 py-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-semibold">{t('apps.title')}</h1>
              <p className="text-text-muted mt-1">
                {t('apps.subtitle')}
              </p>
            </div>
            <StyledButton
              icon="IconRefreshAlert"
              onClick={handleCheckUpdates}
              disabled={checkingUpdates || !isOnline}
              loading={checkingUpdates}
            >
              {t('nav.settings.checkUpdates')}
            </StyledButton>
          </div>
          {loading && <LoadingSpinner fullscreen />}
          {!loading && (
            <StyledTable<ServiceSlim & { actions?: any }>
              className="font-semibold !overflow-x-auto"
              rowLines={true}
              columns={[
                {
                  accessor: 'friendly_name',
                  title: t('apps.col.name'),
                  render(record) {
                    return (
                      <div className="flex flex-col">
                        <p>{record.friendly_name || record.service_name}</p>
                        <p className="text-sm text-text-muted">{record.description}</p>
                      </div>
                    )
                  },
                },
                {
                  accessor: 'ui_location',
                  title: t('apps.col.location'),
                  render: (record) => (
                    <a
                      href={getServiceLink(record.ui_location || 'unknown', record.custom_url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-desert-green hover:underline font-semibold"
                    >
                      {record.ui_location}
                    </a>
                  ),
                },
                {
                  accessor: 'installed',
                  title: t('common.installed'),
                  render: (record) =>
                    record.installed ? <IconCheck className="h-6 w-6 text-desert-green" /> : '',
                },
                {
                  accessor: 'container_image',
                  title: t('contentUpdates.col.version'),
                  render: (record) => {
                    if (!record.installed) return null
                    const currentTag = extractTag(record.container_image)
                    if (record.available_update_version) {
                      return (
                        <div className="flex items-center gap-1.5">
                          <span className="text-text-muted">{currentTag}</span>
                          <IconArrowUp className="h-4 w-4 text-desert-green" />
                          <span className="text-desert-green font-semibold">
                            {record.available_update_version}
                          </span>
                        </div>
                      )
                    }
                    return <span className="text-text-secondary">{currentTag}</span>
                  },
                },
                {
                  accessor: 'actions',
                  title: t('zimManager.actions'),
                  className: '!whitespace-normal',
                  render: (record) => <AppActions record={record} />,
                },
              ]}
              data={props.system.services}
            />
          )}
          {installActivity.length > 0 && (
            <InstallActivityFeed activity={installActivity} className="mt-8" withHeader />
          )}
        </main>
      </div>
    </SettingsLayout>
  )
}

