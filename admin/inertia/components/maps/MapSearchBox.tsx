import { useEffect, useMemo, useRef, useState } from 'react'
import {
  IconBuilding,
  IconHome,
  IconLoader2,
  IconMapPin,
  IconMapPinFilled,
  IconRoad,
  IconSearch,
  IconX,
} from '@tabler/icons-react'

import api from '~/lib/api'
import type { MapSearchResult } from '../../../types/maps'
import { getLocale, t } from '../../../constants/i18n'
import { placeKindName } from '../../../constants/map_places'
import { parseCoordinatesInput, searchZoom } from '~/lib/map_search_ui'

export type MapSearchPick = {
  lat: number
  lng: number
  zoom: number
  /** Для подсказки на карте: название и вид места. */
  title: string
  kind: string | null
  address: string | null
}

type Props = {
  /** Есть ли скачанные указатели поиска (иначе ищутся только координаты). */
  hasIndex: boolean
  canChange: boolean
  onPick: (pick: MapSearchPick) => void
  onFocusChange?: (focused: boolean) => void
}

/** Где сейчас карта — из запомненного вида (MapComponent пишет его при каждом сдвиге). */
function currentMapCenter(): { lat: number; lon: number } | null {
  try {
    const v = JSON.parse(localStorage.getItem('kladez:map-view') ?? 'null')
    if (v && Number.isFinite(v.latitude) && Number.isFinite(v.longitude)) return { lat: v.latitude, lon: v.longitude }
  } catch {}
  return null
}

function formatDistance(km: number | null): string | null {
  if (km === null || !Number.isFinite(km)) return null
  if (km < 1) return t('mapsUi.distanceM', { m: Math.max(10, Math.round((km * 1000) / 10) * 10) })
  return t('mapsUi.distanceKm', { km: km < 10 ? km.toFixed(1).replace('.', getLocale() === 'ru' ? ',' : '.') : Math.round(km) })
}

function ResultIcon({ r }: { r: MapSearchResult }) {
  const cls = 'shrink-0 text-text-muted'
  if (r.cls === 'place') return <IconMapPinFilled size={18} className={cls} />
  if (r.cls === 'street') return <IconRoad size={18} className={cls} />
  if (r.cls === 'house') return <IconHome size={18} className={cls} />
  if (r.kind === 'building') return <IconBuilding size={18} className={cls} />
  return <IconMapPin size={18} className={cls} />
}

/**
 * Кладезъ: поиск по карте без интернета — города, улицы, дома, места; координаты тоже.
 * Результаты — по указателям поиска, скачанным вместе с картами.
 */
export default function MapSearchBox({ hasIndex, canChange, onPick, onFocusChange }: Props) {
  const locale = getLocale()
  const [text, setText] = useState('')
  const [open, setOpen] = useState(false)
  const [results, setResults] = useState<MapSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [failed, setFailed] = useState(false)
  const [active, setActive] = useState(0)
  const [downloadInfo, setDownloadInfo] = useState<{ size: number; count: number } | null>(null)
  const [downloadMessage, setDownloadMessage] = useState<string | null>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  const coords = useMemo(() => parseCoordinatesInput(text), [text])
  const query = text.trim()

  // Поиск с задержкой: не на каждую букву.
  useEffect(() => {
    setFailed(false)
    if (!hasIndex || coords || query.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(async () => {
      const c = currentMapCenter()
      const res = await api.searchMap(query, c?.lat, c?.lon, ctrl.signal)
      if (ctrl.signal.aborted) return
      setLoading(false)
      if (res === null) {
        setFailed(true)
        setResults([])
      } else {
        setResults(res)
        setActive(0)
      }
    }, 250)
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [query, coords, hasIndex])

  // Указателя нет — узнать, можно ли его скачать (и сколько весит).
  useEffect(() => {
    if (hasIndex || !open || downloadInfo) return
    let cancelled = false
    api.mapSearchStatus().then((s) => {
      if (cancelled || !s) return
      setDownloadInfo({ size: s.missing.reduce((n, m) => n + m.size_mb, 0), count: s.missing.length })
    })
    return () => {
      cancelled = true
    }
  }, [hasIndex, open, downloadInfo])

  // Закрыть список при нажатии мимо.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pickResult = (r: MapSearchResult) => {
    const kind = placeKindName(r.kind, locale)
    onPick({
      lat: r.lat,
      lng: r.lon,
      zoom: searchZoom(r.cls, r.kind),
      title: r.name || kind || '',
      kind: r.name ? kind : null,
      address: [r.address, r.city].filter(Boolean).join(', ') || null,
    })
    setOpen(false)
  }

  const pickCoords = () => {
    if (!coords) return
    onPick({ lat: coords.lat, lng: coords.lng, zoom: 15, title: `${coords.lat}, ${coords.lng}`, kind: null, address: null })
    setOpen(false)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setOpen(false)
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setOpen(true)
      setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (e.key === 'Enter') {
      if (coords) pickCoords()
      else if (results[active]) pickResult(results[active])
    }
  }

  const startDownload = async () => {
    try {
      const r = await api.downloadMapSearchIndexes()
      setDownloadMessage(r?.queued?.length ? t('mapsUi.searchQueued') : t('mapsUi.searchNothingToDownload'))
    } catch {
      setDownloadMessage(t('mapsUi.searchFailed'))
    }
  }

  const showPanel = open && (coords || query.length >= 2 || !hasIndex)

  return (
    <div
      ref={boxRef}
      className="relative w-0 flex-1 min-w-[10rem] sm:flex-none sm:w-80"
      onFocus={() => onFocusChange?.(true)}
      onBlur={() => onFocusChange?.(false)}
    >
      <IconSearch size={16} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-text-muted" />
      <input
        type="search"
        value={text}
        placeholder={t('mapsUi.searchPlaceholder')}
        aria-label={t('mapsUi.searchPlaceholder')}
        onChange={(e) => {
          setText(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="w-full rounded border border-border-default bg-surface-primary py-1 pl-7 pr-7 text-sm text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
      />
      {text && (
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={() => {
            setText('')
            setResults([])
          }}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-text-muted hover:text-text-primary"
        >
          <IconX size={14} />
        </button>
      )}

      {showPanel && (
        <div className="absolute left-0 right-0 top-full z-[60] mt-1 max-h-[60vh] overflow-y-auto rounded border border-border-default bg-surface-primary shadow-lg sm:min-w-[22rem]">
          {coords && (
            <button
              type="button"
              onClick={pickCoords}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary"
            >
              <IconMapPin size={18} className="shrink-0 text-text-muted" />
              {t('mapsUi.goToCoords', { coords: `${coords.lat}, ${coords.lng}` })}
            </button>
          )}

          {!coords && !hasIndex && (
            <div className="px-3 py-2 text-sm text-text-secondary">
              <p>{t('mapsUi.searchNoIndex')}</p>
              {canChange && downloadInfo && downloadInfo.count > 0 && !downloadMessage && (
                <button
                  type="button"
                  onClick={startDownload}
                  className="mt-2 rounded bg-desert-green px-3 py-1 text-xs font-medium text-white hover:opacity-90"
                >
                  {t('mapsUi.searchDownload', { size: downloadInfo.size })}
                </button>
              )}
              {downloadMessage && <p className="mt-2 text-text-primary">{downloadMessage}</p>}
            </div>
          )}

          {!coords && hasIndex && loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-3 py-2 text-sm text-text-muted">
              <IconLoader2 size={16} className="animate-spin" /> {t('mapsUi.searching')}
            </div>
          )}
          {!coords && hasIndex && failed && <div className="px-3 py-2 text-sm text-text-secondary">{t('mapsUi.searchFailed')}</div>}
          {!coords && hasIndex && !loading && !failed && query.length >= 2 && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-text-secondary">{t('mapsUi.searchNothing')}</div>
          )}

          {!coords &&
            results.map((r, i) => {
              const kind = placeKindName(r.kind, locale)
              const title = r.name || kind || ''
              const sub = [r.name ? kind : null, r.address, r.city, formatDistance(r.distanceKm)].filter(Boolean).join(' · ')
              return (
                <button
                  key={r.id}
                  type="button"
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pickResult(r)}
                  className={`flex w-full items-start gap-2 px-3 py-2 text-left ${i === active ? 'bg-surface-secondary' : ''}`}
                >
                  <span className="mt-0.5">
                    <ResultIcon r={r} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-text-primary">{title}</span>
                    {sub && <span className="block truncate text-xs text-text-muted">{sub}</span>}
                  </span>
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
