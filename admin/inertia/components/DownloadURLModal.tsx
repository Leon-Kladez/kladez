import { useState } from 'react'
import StyledModal, { StyledModalProps } from './StyledModal'
import Input from './inputs/Input'
import api from '~/lib/api'
import { t, formatBytes } from '../../constants/i18n'

export type DownloadURLModalProps = Omit<
  StyledModalProps,
  'onConfirm' | 'open' | 'confirmText' | 'cancelText' | 'confirmVariant' | 'children'
> & {
  suggestedURL?: string
  onPreflightSuccess?: (url: string) => void
}

const DownloadURLModal: React.FC<DownloadURLModalProps> = ({
  suggestedURL,
  onPreflightSuccess,
  ...modalProps
}) => {
  const [url, setUrl] = useState<string>('')
  const [messages, setMessages] = useState<string[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  async function runPreflightCheck(downloadUrl: string) {
    try {
      setLoading(true)
      setMessages([t('mapsDownloadUrl.checking', { url: downloadUrl })])
      const res = await api.downloadRemoteMapRegionPreflight(downloadUrl)
      if (!res) {
        throw new Error(t('mapsDownloadUrl.unknownError'))
      }

      if ('message' in res) {
        throw new Error(res.message)
      }

      setMessages((prev) => [
        ...prev,
        t('mapsDownloadUrl.passed', { filename: res.filename, size: formatBytes(res.size) }),
      ])

      if (onPreflightSuccess) {
        onPreflightSuccess(downloadUrl)
      }
    } catch (error) {
      console.error('Preflight check failed:', error)
      setMessages((prev) => [...prev, t('mapsDownloadUrl.failed', { error: error.message })])
    } finally {
      setLoading(false)
    }
  }

  return (
    <StyledModal
      {...modalProps}
      onConfirm={() => runPreflightCheck(url)}
      open={true}
      confirmText={t('common.download')}
      confirmIcon="IconDownload"
      cancelText={t('common.cancel')}
      confirmVariant="primary"
      confirmLoading={loading}
      cancelLoading={loading}
      large
    >
      <div className="flex flex-col pb-4">
        <p className="text-text-secondary mb-8">
          {t('mapsDownloadUrl.description')}
        </p>
        <Input
          name="download-url"
          label=""
          placeholder={suggestedURL || t('mapsDownloadUrl.placeholder')}
          className="mb-4"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <div className="min-h-24 max-h-96 overflow-y-auto bg-surface-secondary p-4 rounded border border-border-default text-left">
          {messages.map((message, idx) => (
            <p
              key={idx}
              className="text-sm text-text-primary font-mono leading-relaxed break-words mb-3"
            >
              {message}
            </p>
          ))}
        </div>
      </div>
    </StyledModal>
  )
}

export default DownloadURLModal
