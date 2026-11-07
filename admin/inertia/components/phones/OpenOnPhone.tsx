import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import classNames from 'classnames'
import { IconDeviceMobile } from '@tabler/icons-react'
import api, { type PhonesInfo } from '~/lib/api'
import { t } from '../../../constants/i18n'

/**
 * «Кладезъ»: «Открыть на телефоне» — QR-код и адрес компьютера в домашней сети.
 * QR рисуется из клеток, которые посчитал сервер, — без внешних сервисов.
 */
export default function OpenOnPhone({ className }: { className?: string }) {
  const { data, isLoading } = useQuery<PhonesInfo | undefined>({
    queryKey: ['phones-info'],
    queryFn: () => api.getPhonesInfo(),
    refetchInterval: 60_000,
  })
  const [selected, setSelected] = useState(0)
  const addresses = data?.addresses ?? []
  const current = addresses[Math.min(selected, Math.max(addresses.length - 1, 0))]

  return (
    <section
      className={classNames(
        'bg-surface-primary rounded-lg border-2 border-border-subtle p-4 sm:p-6',
        className
      )}
      aria-labelledby="open-on-phone-title"
    >
      <h2 id="open-on-phone-title" className="flex items-center gap-2 text-2xl font-semibold mb-3">
        <IconDeviceMobile className="size-7 shrink-0" aria-hidden="true" />
        {t('phones.open.title')}
      </h2>

      {isLoading && <p className="text-text-muted">{t('phones.open.loading')}</p>}

      {!isLoading && !current && (
        <div>
          <p className="text-lg font-semibold">{t('phones.open.noneTitle')}</p>
          <p className="text-text-muted mt-1">{t('phones.open.noneText')}</p>
        </div>
      )}

      {current && (
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-center sm:items-start">
          <svg
            role="img"
            aria-label={t('phones.open.qrAlt', { url: current.url })}
            viewBox={`-2 -2 ${current.qr.size + 4} ${current.qr.size + 4}`}
            className="w-48 h-48 shrink-0 rounded bg-white p-1"
            shapeRendering="crispEdges"
          >
            <rect x={-2} y={-2} width={current.qr.size + 4} height={current.qr.size + 4} fill="#fff" />
            <path d={current.qr.path} fill="#000" />
          </svg>
          <div className="min-w-0 w-full">
            <p className="text-lg">{t('phones.open.hint')}</p>
            <p className="text-text-muted mt-3">{t('phones.open.orType')}</p>
            <p className="text-2xl font-bold font-mono break-all select-all mt-1">{current.url}</p>
            {addresses.length > 1 && (
              <div className="mt-4">
                <p className="text-text-muted">{t('phones.open.otherAddresses')}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  {addresses.map((a, i) => (
                    <button
                      key={a.ip}
                      type="button"
                      onClick={() => setSelected(i)}
                      aria-pressed={a === current}
                      className={classNames(
                        'rounded-lg border-2 px-3 py-1.5 text-base break-all',
                        a === current
                          ? 'border-desert-green bg-desert-green text-white'
                          : 'border-border-subtle hover:border-desert-green'
                      )}
                    >
                      {t(`phones.kind.${a.kind}`)}: {a.ip}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
