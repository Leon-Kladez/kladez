import { useEffect, useState } from 'react'
import { IconCopy, IconInfoCircle, IconLoader2, IconMapPin, IconX } from '@tabler/icons-react'

import api from '~/lib/api'
import type { PlaceInfo } from '~/lib/map_place_info'
import { getLocale, t } from '../../../constants/i18n'
import { placeKindName } from '../../../constants/map_places'

export type HerePoint = { lat: number; lon: number; place: PlaceInfo | null }

type Props = {
  here: HerePoint
  hasIndex: boolean
  canChange: boolean
  onClose: () => void
  onRouteFrom: (label: string) => void
  onRouteTo: (label: string) => void
  onAddMarker: () => void
}

function distanceLabel(m: number): string {
  return m < 1000 ? `${m} ${t('mapsUi.m')}` : `${(m / 1000).toFixed(1).replace('.', getLocale() === 'ru' ? ',' : '.')} ${t('mapsUi.km')}`
}

/** Кладезъ: «Что здесь?» — слева, как на openstreetmap.org: адрес, места рядом, район, город, регион. */
export default function HerePanel({ here, hasIndex, canChange, onClose, onRouteFrom, onRouteTo, onAddMarker }: Props) {
  const locale = getLocale()
  const [info, setInfo] = useState<Awaited<ReturnType<typeof api.mapHere>>>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    setInfo(null)
    setCopied(false)
    if (!hasIndex) return
    setLoading(true)
    api.mapHere(here.lat, here.lon).then((r) => {
      if (cancelled) return
      setInfo(r)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [here.lat, here.lon, hasIndex])

  const coords = `${here.lat.toFixed(6)}, ${here.lon.toFixed(6)}`
  const addressLine = info?.address
    ? [info.address.street, info.address.house].filter(Boolean).join(', ')
    : null
  // Заголовок: что нажали (место, дом) → адрес → координаты.
  const title =
    (here.place?.kind ? `${here.place.kind} «${here.place.title}»` : here.place?.title) ||
    addressLine ||
    t('routes.point', { coords: `${here.lat.toFixed(5)}, ${here.lon.toFixed(5)}` })
  const routeLabel = here.place?.title || addressLine || t('routes.point', { coords: `${here.lat.toFixed(5)}, ${here.lon.toFixed(5)}` })

  const row = (label: string, value: string | null | undefined) =>
    value ? (
      <div className="border-b border-border-default py-1.5 text-sm last:border-0">
        <span className="text-text-muted">{label}: </span>
        <span className="text-text-primary">{value}</span>
      </div>
    ) : null

  return (
    <div className="flex max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-primary shadow-lg">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <IconInfoCircle size={18} /> {t('here.title')}
        </div>
        <button type="button" onClick={onClose} title={t('routes.close')} className="rounded p-1 text-text-muted hover:text-text-primary">
          <IconX size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        <div className="text-base font-semibold text-text-primary break-words">{title}</div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => onRouteFrom(routeLabel)}
            className="rounded border border-desert-green px-2.5 py-1 text-xs text-desert-green hover:bg-surface-secondary"
          >
            {t('routes.setFrom')}
          </button>
          <button
            type="button"
            onClick={() => onRouteTo(routeLabel)}
            className="rounded border border-desert-green px-2.5 py-1 text-xs text-desert-green hover:bg-surface-secondary"
          >
            {t('routes.setTo')}
          </button>
          {canChange && (
            <button
              type="button"
              onClick={onAddMarker}
              className="flex items-center gap-1 rounded bg-desert-green px-2.5 py-1 text-xs text-white hover:opacity-90"
            >
              <IconMapPin size={14} /> {t('mapsUi.addMarkerHere')}
            </button>
          )}
        </div>

        {!hasIndex && <p className="text-sm text-text-muted">{t('here.noIndex')}</p>}
        {loading && (
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <IconLoader2 size={16} className="animate-spin" /> {t('here.loading')}
          </div>
        )}

        {info && (
          <>
            <div>
              <div className="mb-1 text-sm font-semibold text-text-secondary">{t('here.nearest')}</div>
              {row(t('here.address'), addressLine)}
              {info.nearby.map((n, i) => {
                const kind = placeKindName(n.kind, locale)
                return (
                  <div key={i} className="flex justify-between gap-2 border-b border-border-default py-1.5 text-sm last:border-0">
                    <span className="min-w-0">
                      <span className="text-text-primary">{n.name || kind}</span>
                      {n.name && kind && <span className="text-text-muted"> · {kind}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-text-muted">{distanceLabel(n.distanceM)}</span>
                  </div>
                )
              })}
              {!addressLine && info.nearby.length === 0 && <p className="text-sm text-text-muted">{t('here.nothing')}</p>}
            </div>

            <div>
              <div className="mb-1 text-sm font-semibold text-text-secondary">{t('here.around')}</div>
              {row(t('here.district'), info.district?.name)}
              {row(t('here.settlement'), info.settlement?.name)}
              {row(t('here.region'), info.regionTitle)}
            </div>
          </>
        )}

        <div className="flex items-center justify-between gap-2 text-sm">
          <span>
            <span className="text-text-muted">{t('here.coords')}: </span>
            <span className="font-mono text-xs text-text-primary">{coords}</span>
          </span>
          <button
            type="button"
            title={t('here.copy')}
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(coords)
                setCopied(true)
              } catch {
                // На телефоне по http буфер обмена недоступен — координаты видны и так.
              }
            }}
            className="flex items-center gap-1 rounded border border-border-default px-2 py-0.5 text-xs text-text-secondary hover:bg-surface-secondary"
          >
            <IconCopy size={13} /> {copied ? t('here.copied') : t('here.copy')}
          </button>
        </div>
      </div>
    </div>
  )
}
