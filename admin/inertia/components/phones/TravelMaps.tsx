import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Link } from '@inertiajs/react'
import { IconRoute } from '@tabler/icons-react'
import api, { type TravelMapsInfo } from '~/lib/api'
import StyledButton from '~/components/StyledButton'
import { useDevice } from '~/hooks/useDevice'
import { formatBytes } from '~/lib/util'
import { t } from '../../../constants/i18n'

/**
 * «Кладезъ»: «Карты в дорогу на телефон» — навигатор Organic Maps для Android. Компьютер скачивает
 * приложение один раз, телефоны в доме берут его по QR-коду прямо с компьютера (без магазина).
 * На самом телефоне вместо QR-кода — кнопка «Скачать приложение на этот телефон».
 */
export default function TravelMaps() {
  const queryClient = useQueryClient()
  const { isComputer } = useDevice()
  const { data } = useQuery<TravelMapsInfo | undefined>({
    queryKey: ['travel-maps'],
    queryFn: () => api.getTravelMaps(),
    // Пока скачивается — часто, чтобы видеть проценты; потом — редко.
    refetchInterval: (q) => (q.state.data?.downloading ? 1500 : 60_000),
  })

  async function prepare() {
    await api.downloadTravelMaps()
    queryClient.invalidateQueries({ queryKey: ['travel-maps'] })
  }

  const pct = data && data.total > 0 ? Math.min(100, Math.round((data.received / data.total) * 100)) : 0
  const current = data?.addresses?.[0]

  return (
    <section className="bg-surface-primary rounded-lg border-2 border-border-subtle p-4 sm:p-6 mt-8" aria-labelledby="travel-maps-title">
      <h2 id="travel-maps-title" className="flex items-center gap-2 text-2xl font-semibold mb-3">
        <IconRoute className="size-7 shrink-0" aria-hidden="true" />
        {t('phones.travel.title')}
      </h2>
      <p className="text-lg">{t('phones.travel.intro')}</p>

      {data?.downloading && (
        <div className="mt-4" aria-live="polite">
          <div className="h-3 w-full rounded bg-surface-secondary overflow-hidden">
            <div className="h-full bg-desert-green transition-all" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-text-muted mt-1">{t('phones.travel.downloading', { pct })}</p>
        </div>
      )}

      {data && !data.downloading && data.error && (
        <p className="mt-4 font-semibold text-desert-red">
          {t(data.error === 'network' ? 'phones.travel.errorNetwork' : 'phones.travel.errorFailed')}
        </p>
      )}

      {data && !data.app && !data.downloading && (
        <div className="mt-4">
          {isComputer ? (
            <>
              <StyledButton variant="primary" icon="IconCloudDownload" onClick={prepare}>
                {t('phones.travel.prepare')}
              </StyledButton>
              <p className="text-sm text-text-muted mt-2">{t('phones.travel.prepareNote')}</p>
            </>
          ) : (
            <p className="font-semibold">{t('phones.travel.notReadyPhone')}</p>
          )}
        </div>
      )}

      {data?.app && (
        <div className="mt-4">
          {isComputer && current ? (
            <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
              <svg
                role="img"
                aria-label={current.url}
                viewBox={`-2 -2 ${current.qr.size + 4} ${current.qr.size + 4}`}
                className="w-48 h-48 shrink-0 rounded bg-white p-1"
                shapeRendering="crispEdges"
              >
                <rect x={-2} y={-2} width={current.qr.size + 4} height={current.qr.size + 4} fill="#fff" />
                <path d={current.qr.path} fill="#000" />
              </svg>
              <div className="min-w-0 w-full">
                <p className="text-lg">{t('phones.travel.scan')}</p>
                <p className="text-base font-mono break-all select-all mt-2">{current.url}</p>
              </div>
            </div>
          ) : (
            !isComputer && (
              <a
                href={data.path}
                className="inline-flex items-center gap-2 rounded-lg bg-desert-green px-5 py-3 text-lg font-semibold text-white hover:brightness-110"
              >
                {t('phones.travel.onPhone')}
              </a>
            )
          )}
          <p className="text-sm text-text-muted mt-3">
            {t('phones.travel.ready', { version: data.app.version, size: formatBytes(data.app.size, 0) })}
            {isComputer && (
              <>
                {' · '}
                <button type="button" className="underline hover:text-text-primary" onClick={prepare}>
                  {t('phones.travel.update')}
                </button>
              </>
            )}
          </p>
        </div>
      )}

      <p className="mt-4 text-text-muted">{t('phones.travel.iphone')}</p>
      <p className="mt-2">
        <Link href="/docs/travel-maps" className="font-semibold text-desert-green underline">
          {t('phones.travel.help')}
        </Link>
      </p>
    </section>
  )
}
