import { useEffect, useState } from 'react'
import { Head, Link } from '@inertiajs/react'
import { IconNavigation } from '@tabler/icons-react'
import AppLayout from '~/layouts/AppLayout'
import { organicMapsRouteUrl, parseGoQuery, type GoTrip } from '~/lib/organic_route'
import { t } from '../../constants/i18n'

/**
 * «Кладезъ»: «Поехали» — сюда ведёт QR-код с компьютера. На телефоне одна большая кнопка
 * отдаёт маршрут навигатору Organic Maps: он ведёт по GPS без интернета. Сама страница
 * ничего не меняет — открывается и на телефоне «только для чтения».
 */
export default function Go() {
  // Адрес читаем в браузере: страница без данных с сервера.
  const [trip, setTrip] = useState<GoTrip | null | undefined>(undefined)
  useEffect(() => {
    setTrip(parseGoQuery(window.location.search))
  }, [])

  return (
    <AppLayout>
      <Head title={t('routes.go.title')} />
      <div className="mx-auto max-w-xl space-y-5 p-6 text-text-primary">
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <IconNavigation className="size-7 shrink-0" aria-hidden="true" />
          {t('routes.go.title')}
        </h2>

        {trip === null && <p className="text-lg">{t('routes.go.bad')}</p>}

        {trip && (
          <>
            <dl className="space-y-2 text-lg">
              <div>
                <dt className="text-sm text-text-muted">{t('routes.from')}</dt>
                <dd>{trip.from.label || `${trip.from.lat}, ${trip.from.lon}`}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('routes.to')}</dt>
                <dd>{trip.to.label || `${trip.to.lat}, ${trip.to.lon}`}</dd>
              </div>
              <div>
                <dt className="text-sm text-text-muted">{t('routes.go.how')}</dt>
                <dd>{t(`routes.mode.${trip.mode}` as 'routes.mode.auto')}</dd>
              </div>
            </dl>
            <a
              href={organicMapsRouteUrl(trip)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-desert-green px-5 py-4 text-xl font-semibold text-white hover:brightness-110"
            >
              <IconNavigation className="size-6" aria-hidden="true" />
              {t('routes.go.open')}
            </a>
            <p className="text-text-secondary">{t('routes.go.then')}</p>
          </>
        )}

        <div className="rounded-lg border border-border-default bg-surface-secondary p-4 text-text-secondary">
          <p>{t('routes.go.needApp')}</p>
          <p className="mt-2">
            <Link href="/docs/travel-maps" className="font-semibold text-desert-green underline">
              {t('routes.go.help')}
            </Link>
          </p>
        </div>
      </div>
    </AppLayout>
  )
}
