// Kladez: ready-made sets «Аптечка / Библиотека / Всё» at the top of the wizard's
// content step. Choosing a set only pre-fills the Wikipedia option and the
// category tiers below; the install itself goes through the existing path.
import classNames from 'classnames'
import { IconCircleCheck, IconLoader2, IconPackage } from '@tabler/icons-react'
import type { BundleWithStatus } from '../../types/collections'
import { t, formatBytes } from '../../constants/i18n'

export interface BundlePickerProps {
  bundles: BundleWithStatus[]
  selectedId: string | null
  onSelect: (bundle: BundleWithStatus) => void
  /** Free bytes on the library disk; null when unknown. */
  freeBytes: number | null
  disabled?: boolean
}

const BundlePicker: React.FC<BundlePickerProps> = ({
  bundles,
  selectedId,
  onSelect,
  freeBytes,
  disabled,
}) => {
  if (bundles.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-surface-primary border border-border-subtle flex items-center justify-center shadow-sm">
          <IconPackage className="w-6 h-6 text-text-primary" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-text-primary">{t('bundles.title')}</h3>
          <p className="text-sm text-text-muted">{t('bundles.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {bundles.map((bundle) => {
          const sizeBytes = bundle.size_mb * 1024 * 1024
          const selected = bundle.id === selectedId
          const tooBig =
            freeBytes !== null && bundle.status !== 'installed' && sizeBytes > freeBytes
          const blocked = disabled || tooBig
          return (
            <button
              key={bundle.id}
              type="button"
              disabled={blocked}
              aria-pressed={selected}
              onClick={() => !blocked && onSelect(bundle)}
              className={classNames(
                'flex flex-col text-left bg-desert-green rounded-lg p-6 text-white border shadow-sm transition-shadow',
                selected ? 'border-lime-400 border-2' : 'border-desert-green',
                blocked ? 'opacity-60 cursor-not-allowed' : 'hover:shadow-lg cursor-pointer'
              )}
            >
              <div className="flex justify-between items-start mb-2 gap-2">
                <h4 className="text-lg font-semibold">{bundle.name}</h4>
                {selected ? (
                  <span className="flex items-center text-lime-400 text-sm shrink-0">
                    <IconCircleCheck className="w-5 h-5 mr-1" />
                    {t('bundles.picked')}
                  </span>
                ) : bundle.status === 'installed' ? (
                  <span className="flex items-center text-lime-400 text-sm shrink-0">
                    <IconCircleCheck className="w-5 h-5 mr-1" />
                    {t('bundles.status.installed')}
                  </span>
                ) : bundle.status === 'downloading' ? (
                  <span className="flex items-center text-lime-400 text-sm shrink-0">
                    <IconLoader2 className="w-5 h-5 mr-1 animate-spin" />
                    {t('bundles.status.downloading')}
                  </span>
                ) : bundle.status === 'partial' ? (
                  <span className="text-gray-200 text-sm shrink-0">
                    {t('bundles.status.partial')}
                  </span>
                ) : null}
              </div>
              <p className="text-2xl font-bold mb-2">
                {t('bundles.size', { size: formatBytes(sizeBytes) })}
              </p>
              <p className="text-gray-200 grow">{bundle.description}</p>
              {tooBig ? (
                <p className="text-sm text-amber-300 mt-3">
                  {t('bundles.notEnoughSpace', {
                    need: formatBytes(sizeBytes),
                    free: formatBytes(freeBytes!),
                  })}
                </p>
              ) : (
                <span className="mt-4 text-sm font-semibold text-lime-300">
                  {selected ? t('bundles.picked') : t('bundles.pick')}
                </span>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-sm text-text-muted mt-4">{t('bundles.manual')}</p>
    </div>
  )
}

export default BundlePicker
