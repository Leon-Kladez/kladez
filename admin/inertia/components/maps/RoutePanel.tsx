import { useEffect, useState } from 'react'
import {
  IconArrowsDownUp,
  IconBike,
  IconCar,
  IconLoader2,
  IconMapPin,
  IconRoute,
  IconWalk,
  IconX,
} from '@tabler/icons-react'

import api from '~/lib/api'
import { useMapMarkers } from '~/hooks/useMapMarkers'
import type { RouteMode, RouteResult } from '../../../app/utils/map_route'
import { getLocale, t } from '../../../constants/i18n'

export type RouteEnd = { lat: number; lon: number; label: string }
export type RouteEnds = { from: RouteEnd | null; to: RouteEnd | null }

type Props = {
  ends: RouteEnds
  onEndsChange: (ends: RouteEnds) => void
  pickMode: 'from' | 'to' | null
  onPickMode: (which: 'from' | 'to' | null) => void
  route: RouteResult | null
  onRoute: (route: RouteResult | null) => void
  onStepClick: (lon: number, lat: number) => void
  onClose: () => void
  canChange: boolean
}

const MODES: { id: RouteMode; icon: typeof IconCar }[] = [
  { id: 'auto', icon: IconCar },
  { id: 'pedestrian', icon: IconWalk },
  { id: 'bicycle', icon: IconBike },
]

export function formatDuration(min: number): string {
  if (min < 60) return t('routes.minutes', { m: Math.max(1, Math.round(min)) })
  return t('routes.hours', { h: Math.floor(min / 60), m: Math.round(min % 60) })
}

function formatKm(km: number): string {
  const s = km < 10 ? km.toFixed(1) : String(Math.round(km))
  return getLocale() === 'ru' ? s.replace('.', ',') : s
}

/** Кладезъ: маршрут без интернета — откуда, куда, способ; линия на карте и подсказки по шагам. */
export default function RoutePanel(props: Props) {
  const { ends, onEndsChange, pickMode, onPickMode, route, onRoute } = props
  const { markers } = useMapMarkers()
  const [mode, setMode] = useState<RouteMode>('auto')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Awaited<ReturnType<typeof api.mapRoutesStatus>>>(null)
  const [enableMessage, setEnableMessage] = useState<string | null>(null)
  const [allMessage, setAllMessage] = useState<string | null>(null)
  const [errorKey, setErrorKey] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    api.mapRoutesStatus().then((s) => !cancelled && setStatus(s))
    return () => {
      cancelled = true
    }
  }, [])

  const ready = status?.service === 'installed' && status.regions.length > 0

  const build = async (m: RouteMode = mode) => {
    if (!ends.from || !ends.to) return
    setLoading(true)
    setError(null)
    setErrorKey(null)
    const res = await api.mapRoute(ends.from, ends.to, m)
    setLoading(false)
    if ('route' in res) onRoute(res.route)
    else {
      onRoute(null)
      setError(res.message)
      setErrorKey(res.key ?? null)
    }
  }

  // Поменяли способ — сразу пересчитать, если маршрут уже был.
  const chooseMode = (m: RouteMode) => {
    setMode(m)
    if (route && ends.from && ends.to) build(m)
  }

  const endField = (which: 'from' | 'to') => {
    const end = ends[which]
    return (
      <div className="flex flex-col gap-1">
        <div className="text-xs font-medium text-text-secondary">{t(which === 'from' ? 'routes.from' : 'routes.to')}</div>
        <div className="flex items-center gap-1">
          <span
            className={`min-w-0 flex-1 truncate rounded border px-2 py-1 text-sm ${
              end ? 'border-border-default text-text-primary' : 'border-dashed border-border-default text-text-muted'
            }`}
          >
            {end ? end.label : '—'}
          </span>
          <button
            type="button"
            title={t('routes.pickOnMap')}
            onClick={() => onPickMode(pickMode === which ? null : which)}
            className={`rounded border p-1.5 ${
              pickMode === which ? 'border-desert-green bg-desert-green text-white' : 'border-border-default text-text-secondary hover:bg-surface-secondary'
            }`}
          >
            <IconMapPin size={16} />
          </button>
        </div>
        {markers.length > 0 && (
          <select
            className="rounded border border-border-default bg-surface-primary px-1 py-0.5 text-xs text-text-secondary"
            value=""
            onChange={(e) => {
              const m = markers.find((x) => String(x.id) === e.target.value)
              if (m) {
                onEndsChange({ ...ends, [which]: { lat: m.latitude, lon: m.longitude, label: t('routes.marker', { name: m.name }) } })
                onRoute(null)
              }
            }}
          >
            <option value="">{t('routes.chooseMarker')}</option>
            {markers.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
        )}
      </div>
    )
  }

  return (
    <div className="flex max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-primary shadow-lg">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <IconRoute size={18} /> {t('routes.title')}
        </div>
        <button type="button" onClick={props.onClose} title={t('routes.close')} className="rounded p-1 text-text-muted hover:text-text-primary">
          <IconX size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-3 overflow-y-auto p-3">
        {status && !ready && (
          <div className="rounded border border-border-default bg-surface-secondary p-2 text-sm text-text-secondary">
            <div className="font-medium text-text-primary">{t('routes.enableTitle')}</div>
            {status.missing.length > 0 || status.service !== 'installed' ? (
              <>
                <p className="mt-1">{t('routes.enableText', { size: status.missing.reduce((n, m) => n + m.size_mb, 0) })}</p>
                {props.canChange ? (
                  !enableMessage && (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await api.enableMapRoutes()
                          setEnableMessage(t('routes.enabling'))
                        } catch {
                          setEnableMessage(t('routes.failed'))
                        }
                      }}
                      className="mt-2 rounded bg-desert-green px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                    >
                      {t('routes.enableButton')}
                    </button>
                  )
                ) : (
                  <p className="mt-1">{t('routes.computerOnly')}</p>
                )}
                {enableMessage && <p className="mt-2 text-text-primary">{enableMessage}</p>}
              </>
            ) : (
              <p className="mt-1">{t('routes.enableNoData')}</p>
            )}
          </div>
        )}

        {endField('from')}
        <div className="-my-1 flex justify-center">
          <button
            type="button"
            title={t('routes.swap')}
            onClick={() => {
              onEndsChange({ from: ends.to, to: ends.from })
              onRoute(null)
            }}
            className="rounded p-1 text-text-muted hover:text-text-primary"
          >
            <IconArrowsDownUp size={16} />
          </button>
        </div>
        {endField('to')}

        {pickMode && <p className="text-xs text-desert-green">{t('routes.pickHint')}</p>}
        {!ends.from && !ends.to && !pickMode && (
          <p className="text-xs text-text-muted">{t('routes.useSearch', { label: t('routes.setTo') })}</p>
        )}

        <div className="grid grid-cols-3 gap-1">
          {MODES.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => chooseMode(id)}
              className={`flex flex-col items-center gap-0.5 rounded border px-1 py-1.5 text-xs ${
                mode === id ? 'border-desert-green bg-desert-green text-white' : 'border-border-default text-text-secondary hover:bg-surface-secondary'
              }`}
            >
              <Icon size={18} />
              {t(`routes.mode.${id}` as 'routes.mode.auto')}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            disabled={!ends.from || !ends.to || loading || (status !== null && !ready)}
            onClick={() => build()}
            className="flex flex-1 items-center justify-center gap-1 rounded bg-desert-green px-3 py-1.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {loading && <IconLoader2 size={16} className="animate-spin" />}
            {loading ? t('routes.building') : t('routes.build')}
          </button>
          {(ends.from || ends.to || route) && (
            <button
              type="button"
              onClick={() => {
                onEndsChange({ from: null, to: null })
                onRoute(null)
                setError(null)
              }}
              className="rounded border border-border-default px-3 py-1.5 text-sm text-text-secondary hover:bg-surface-secondary"
            >
              {t('routes.clear')}
            </button>
          )}
        </div>

        {error && <p className="text-sm text-red-700">{error}</p>}

        {/* Дороги соседних регионов без скачанной карты: маршрут через всю страну. */}
        {ready && status && status.extra.length > 0 && (errorKey === 'routes.gap' || allMessage || error === null) && (
          <div
            className={`rounded border p-2 text-sm text-text-secondary ${
              errorKey === 'routes.gap' ? 'border-desert-green bg-surface-secondary' : 'border-border-default'
            }`}
          >
            <div className="font-medium text-text-primary">{t('routes.allTitle')}</div>
            <p className="mt-1">
              {t('routes.allText', {
                regions: status.extra.map((r) => r.title.replace(/ федеральный округ/i, '')).join(', '),
                size: status.extra.reduce((n, r) => n + r.size_mb, 0),
              })}
            </p>
            {props.canChange ? (
              allMessage ? (
                <p className="mt-2 text-text-primary">{allMessage}</p>
              ) : (
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await api.enableMapRoutes(true)
                      setAllMessage(t('routes.allQueued'))
                    } catch {
                      setAllMessage(t('routes.failed'))
                    }
                  }}
                  className="mt-2 rounded bg-desert-green px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  {t('routes.allButton')}
                </button>
              )
            ) : (
              <p className="mt-1">{t('routes.computerOnly')}</p>
            )}
          </div>
        )}

        {route && (
          <div className="flex flex-col gap-1">
            <div className="text-base font-semibold text-text-primary">
              {t('routes.summary', { km: formatKm(route.distanceKm), time: formatDuration(route.timeMin) })}
            </div>
            {route.mode === 'auto' && <p className="text-xs text-text-muted">{t('routes.noTraffic')}</p>}
            <div className="mt-1 text-xs font-medium text-text-secondary">{t('routes.steps')}</div>
            <ol className="flex flex-col">
              {route.steps.map((s, i) => {
                const pt = route.line[Math.min(s.at, route.line.length - 1)]
                return (
                  <li key={i}>
                    <button
                      type="button"
                      onClick={() => pt && props.onStepClick(pt[0], pt[1])}
                      className="flex w-full gap-2 rounded px-1 py-1 text-left text-sm hover:bg-surface-secondary"
                    >
                      <span className="w-5 shrink-0 text-right text-text-muted">{i + 1}.</span>
                      <span className="min-w-0 flex-1 text-text-primary">
                        {s.instruction}
                        {s.distanceKm > 0 && (
                          <span className="ml-1 text-xs text-text-muted">
                            · {s.distanceKm < 1 ? `${Math.round(s.distanceKm * 1000)} ${t('mapsUi.m')}` : `${formatKm(s.distanceKm)} ${t('mapsUi.km')}`}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
