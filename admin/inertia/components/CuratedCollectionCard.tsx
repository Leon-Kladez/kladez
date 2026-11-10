import { formatBytes } from '~/lib/util'
import DynamicIcon, { DynamicIconName } from './DynamicIcon'
import type { CollectionWithStatus } from '../../types/collections'
import classNames from 'classnames'
import { IconCircleCheck } from '@tabler/icons-react'
import { t } from '../../constants/i18n'
import { canStartSet, type SetProgress } from '~/lib/set_progress'
import SetDownloadStatus from './SetDownloadStatus'
import { oneVariantPerRegion } from '../../constants/map_variants'

export interface CuratedCollectionCardProps {
  collection: CollectionWithStatus
  onClick?: (collection: CollectionWithStatus) => void;
  size?: 'small' | 'large'
  /**
   * Kladez: live state of the set (from the download-jobs poll). Without it the
   * card falls back to the server's all_installed flag, as before.
   */
  progress?: SetProgress
}

const CuratedCollectionCard: React.FC<CuratedCollectionCardProps> = ({ collection, onClick, size = 'small', progress }) => {
  // Кладезъ: регион считается один раз — подробный и обзорный варианты не складываются.
  const regions = oneVariantPerRegion(collection.resources ?? [], new Set(collection.installed_ids ?? []))
  const totalSizeBytes = regions.reduce((acc, resource) => acc + resource.size_mb * 1024 * 1024, 0)
  const installed = progress ? progress.state === 'installed' : collection.all_installed
  const clickable = progress ? canStartSet(progress) : !collection.all_installed
  return (
    <div
      className={classNames(
        'flex flex-col bg-desert-green rounded-lg p-6 text-white border border-b-desert-green shadow-sm transition-shadow',
        clickable ? 'hover:shadow-lg cursor-pointer' : 'cursor-default',
        { 'opacity-65': installed || progress?.state === 'unavailable' },
        { 'h-56': size === 'small' && !progress, 'min-h-56': size === 'small' && !!progress, 'h-80': size === 'large' }
      )}
      aria-disabled={!clickable}
      onClick={() => {
        if (!clickable) {
          return
        }
        if (onClick) {
          onClick(collection)
        }
      }}
    >
      <div className="flex items-center mb-4">
        <div className="flex justify-between w-full items-center">
          <div className="flex">
            <DynamicIcon icon={collection.icon as DynamicIconName} className="w-6 h-6 mr-2" />
            <h3 className="text-lg font-semibold">{collection.name}</h3>
          </div>
          {!progress && collection.all_installed && (
            <div className="flex items-center">
              <IconCircleCheck
                className="w-5 h-5 text-lime-400 ml-2"
                title={t('collection.allDownloaded')}
              />
              <p className="text-lime-400 text-sm ml-1">{t('collection.allDownloaded')}</p>
            </div>
          )}
        </div>
      </div>
      <p className="text-gray-200 grow">{collection.description}</p>
      <p className="text-gray-200 text-xs mt-2">
        {t('collection.itemsAndSize', { n: regions.length, size: formatBytes(totalSizeBytes, 0) })}
      </p>
      {progress && <SetDownloadStatus progress={progress} />}
    </div>
  )
}
export default CuratedCollectionCard
