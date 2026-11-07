// «Кладезъ»: строка состояния на зелёной карточке набора — проценты с тонкой
// полосой, пока качается; «Скачано», когда всё на диске; понятная ошибка, если
// не вышло. Данные — из setProgress (inertia/lib/set_progress.ts).
import { IconAlertTriangle, IconCircleCheck, IconClockHour4, IconLoader2 } from '@tabler/icons-react'
import type { SetProgress } from '~/lib/set_progress'
import { t } from '../../constants/i18n'

export default function SetDownloadStatus({ progress }: { progress: SetProgress }) {
  if (progress.state === 'downloading') {
    const label =
      progress.phase === 'waiting'
        ? t('collection.state.waiting', { percent: progress.percent })
        : progress.phase === 'retrying'
          ? t('collection.state.retrying', { percent: progress.percent })
          : t('collection.state.downloading', { percent: progress.percent })
    const Icon = progress.phase === 'waiting' ? IconClockHour4 : IconLoader2
    return (
      <div className="mt-3" role="status" aria-live="polite">
        <p className="flex items-center text-sm text-lime-300 font-semibold">
          <Icon
            className={`w-4 h-4 mr-1 shrink-0 ${progress.phase === 'waiting' ? '' : 'animate-spin'}`}
            aria-hidden="true"
          />
          {label}
        </p>
        <div
          className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-white/20"
          role="progressbar"
          aria-label={t('collection.state.progressLabel')}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress.percent}
        >
          <div
            className="h-full rounded-full bg-lime-400 transition-all duration-1000 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>
    )
  }

  if (progress.state === 'installed') {
    return (
      <p className="mt-3 flex items-center text-sm text-lime-300 font-semibold" role="status">
        <IconCircleCheck className="w-4 h-4 mr-1 shrink-0" aria-hidden="true" />
        {t('collection.state.installed')}
      </p>
    )
  }

  if (progress.state === 'failed') {
    return (
      <p className="mt-3 flex items-start text-sm text-amber-300 font-semibold" role="status">
        <IconAlertTriangle className="w-4 h-4 mr-1 mt-0.5 shrink-0" aria-hidden="true" />
        {progress.failed < progress.total
          ? t('collection.state.failedSome', { failed: progress.failed, total: progress.total })
          : t('collection.state.failed')}
      </p>
    )
  }

  if (progress.state === 'unavailable') {
    return <p className="mt-3 text-sm text-gray-300">{t('collection.state.unavailable')}</p>
  }

  if (progress.installed > 0) {
    return (
      <p className="mt-3 text-sm text-gray-200">
        {t('collection.state.partial', { installed: progress.installed, total: progress.total })}
      </p>
    )
  }
  return null
}
