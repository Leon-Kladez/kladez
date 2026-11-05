import { t } from '../../../constants/i18n'
export default function ServerError(props: { error: any }) {
  return (
    <>
      <div className="container">
        <div className="title">{t('errors.server.title')}</div>

        <span>{props.error.message}</span>
      </div>
    </>
  )
}