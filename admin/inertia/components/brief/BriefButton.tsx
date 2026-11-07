import { useCallback, useEffect, useState } from 'react'
import { usePage } from '@inertiajs/react'
import classNames from 'classnames'
import { IconPlayerPlayFilled } from '@tabler/icons-react'
import BriefModal from './BriefModal'
import {
  browserStorage,
  briefSeen,
  hasBrief,
  markBriefSeen,
  shouldAutoOpenBrief,
  type BriefSources,
} from '~/lib/brief'
import { t } from '../../../constants/i18n'

/**
 * «Кладезъ»: кнопка «Бриф» в шапке. При первом входе на главную ролик
 * открывается сам; после закрытия — больше не сам, только по кнопке.
 * Нет файла ролика — нет ни кнопки, ни окна.
 */
export default function BriefButton({ className }: { className?: string }) {
  const { brief } = usePage<{ brief?: BriefSources }>().props
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (shouldAutoOpenBrief(brief, briefSeen(browserStorage()), window.location.pathname)) {
      setOpen(true)
    }
  }, [brief])

  const close = useCallback(() => {
    markBriefSeen(browserStorage())
    setOpen(false)
  }, [])

  if (!brief || !hasBrief(brief)) return null

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        title={t('brief.buttonHint')}
        className={classNames(
          'inline-flex items-center gap-1.5 rounded-full border-2 border-desert-green bg-surface-primary px-3 py-1 text-sm font-semibold text-text-primary shadow-sm hover:bg-desert-green hover:text-white',
          className
        )}
      >
        <IconPlayerPlayFilled className="size-4" aria-hidden="true" />
        {t('brief.button')}
      </button>
      <BriefModal sources={brief} open={open} onClose={close} />
    </>
  )
}
