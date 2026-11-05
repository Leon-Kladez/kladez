import { useEffect, useState } from 'react'
import StyledModal from './StyledModal'
import StyledButton from './StyledButton'
import Input from './inputs/Input'
import { getServiceLink, normalizeCustomUrl } from '~/lib/navigation'
import { ServiceSlim } from '../../types/services'
import api from '~/lib/api'
import { tx } from '~/lib/tx'
import { t } from '../../constants/i18n'

interface AppUrlModalProps {
  open: boolean
  /** The app whose launch URL is being configured. Null while closed. */
  service: ServiceSlim | null
  onClose: () => void
  /** Called after a successful save/clear so the parent can refresh the link. */
  onSaved: () => void
  showError: (msg: string) => void
}

/**
 * Set or clear an app's custom launch URL — used when the instance sits behind a reverse proxy or
 * local DNS (e.g. https://jellyfin.myhomelab.net). Leaving the field empty clears the override and
 * reverts to the default host + port link. Works for both curated and custom apps.
 */
export default function AppUrlModal({ open, service, onClose, onSaved, showError }: AppUrlModalProps) {
  const [value, setValue] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Prefill from the app's stored override each time the modal opens for a service.
  useEffect(() => {
    if (open && service) setValue(service.custom_url ?? '')
  }, [open, service])

  const trimmed = value.trim()
  const normalized = normalizeCustomUrl(value)
  const isInvalid = trimmed.length > 0 && !normalized
  // What clicking "Open" will actually resolve to once saved.
  const previewLink = service ? getServiceLink(service.ui_location || '', value) : ''
  const usingDefault = !normalized

  async function handleSave() {
    if (!service || isInvalid) return
    setSubmitting(true)
    // Empty clears the override; the backend re-normalizes/validates the value too.
    const result = await api.setServiceCustomUrl(service.service_name, trimmed ? trimmed : null)
    setSubmitting(false)
    if (!result?.success) {
      showError(t('appUrl.saveFailed'))
      return
    }
    onSaved()
  }

  const appName = service?.friendly_name || service?.service_name || 'this app'

  return (
    <StyledModal
      title={t('appUrl.title')}
      open={open}
      onCancel={onClose}
      onClose={onClose}
      cancelText={t('common.cancel')}
      onConfirm={handleSave}
      confirmVariant="primary"
      confirmText={t('common.save')}
      confirmIcon="IconCheck"
      confirmLoading={submitting}
      confirmDisabled={isInvalid}
    >
      <div className="space-y-4 text-sm">
        <p className="text-text-muted">
          {tx('appUrl.description', {
            app: <span className="font-medium text-text-primary">{appName}</span>,
            address: service?.ui_location
              ? t('appUrl.hostPortValue', { port: service.ui_location })
              : t('appUrl.hostPort'),
          })}
        </p>

        <div>
          <div className="flex items-end gap-2">
            <Input
              name="customUrl"
              label={t('appUrl.label')}
              placeholder="http://jellyfin.myhomelab.net"
              maxLength={255}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              error={isInvalid}
              className="flex-1 min-w-0"
            />
            {value.length > 0 && (
              <StyledButton size="sm" variant="ghost" icon="IconX" onClick={() => setValue('')} className="mb-1.5">
                {t('common.clear')}
              </StyledButton>
            )}
          </div>
          {isInvalid ? (
            <p className="mt-1.5 text-xs text-red-500">
              {t('appUrl.invalid')}
            </p>
          ) : (
            <>
              <p className="mt-1.5 text-xs text-text-muted">
                {tx('appUrl.noScheme', { scheme: <span className="font-mono">http://</span> })}</p>
              <p className="mt-1.5 text-xs text-text-muted">
                {tx('appUrl.opensAs', {
                  link: <span className="font-mono break-all text-text-primary">{previewLink}</span>,
                })}
                {usingDefault ? t('appUrl.defaultSuffix') : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </StyledModal>
  )
}
