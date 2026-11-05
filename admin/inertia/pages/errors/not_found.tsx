import { t } from '../../../constants/i18n'
export default function NotFound() {
  return (
    <>
      <div className="container">
        <div className="title">{t('errors.notFound.title')}</div>

        <span>{t('errors.notFound.text')}</span>
      </div>
    </>
  )
}