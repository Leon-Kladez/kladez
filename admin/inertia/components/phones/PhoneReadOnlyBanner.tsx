import classNames from 'classnames'
import { IconDeviceMobile } from '@tabler/icons-react'
import { useDevice } from '~/hooks/useDevice'
import { t } from '../../../constants/i18n'

/** «Кладезъ»: надпись на телефоне — смотреть можно, изменять только на компьютере. */
export default function PhoneReadOnlyBanner({ className }: { className?: string }) {
  const { canChange } = useDevice()
  if (canChange) return null
  return (
    <div
      role="status"
      className={classNames(
        'flex items-start gap-3 bg-desert-orange-light/15 border-b-2 border-desert-orange-light px-4 py-3 text-text-primary',
        className
      )}
    >
      <IconDeviceMobile className="size-6 shrink-0 mt-0.5" aria-hidden="true" />
      <p className="text-base min-w-0">
        <span className="font-semibold">{t('phones.readOnly.bannerTitle')}.</span>{' '}
        {t('phones.readOnly.bannerText')}
      </p>
    </div>
  )
}
