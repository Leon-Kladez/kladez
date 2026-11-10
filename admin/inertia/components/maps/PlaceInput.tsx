import { useEffect, useRef, useState } from 'react'
import { IconLoader2 } from '@tabler/icons-react'

import api from '~/lib/api'
import type { MapSearchResult } from '../../../types/maps'
import { getLocale, t } from '../../../constants/i18n'
import { placeKindName } from '../../../constants/map_places'
import { getLiveMapCenter, parseCoordinatesInput, searchZoom } from '~/lib/map_search_ui'

export type PlacePick = { lat: number; lon: number; label: string; zoom: number }

type Props = {
  /** Что сейчас выбрано (подпись) — видно, пока человек не начал печатать. */
  value: string | null
  placeholder: string
  onPick: (pick: PlacePick) => void
  hasIndex: boolean
}

/**
 * Кладезъ: поле с поиском для «Откуда» / «Куда»: город, улица, дом, место или координаты.
 * Подсказки — из скачанных указателей поиска, ближние к открытому месту карты — первыми.
 */
export default function PlaceInput({ value, placeholder, onPick, hasIndex }: Props) {
  const locale = getLocale()
  const [text, setText] = useState<string | null>(null) // null — не редактируется, показываем value
  const [results, setResults] = useState<MapSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)

  const query = (text ?? '').trim()
  const coords = text !== null ? parseCoordinatesInput(text) : null

  useEffect(() => {
    setResults([])
    if (text === null || !hasIndex || coords || query.length < 2) {
      setLoading(false)
      return
    }
    const ctrl = new AbortController()
    setLoading(true)
    const timer = window.setTimeout(async () => {
      const c = getLiveMapCenter()
      const res = await api.searchMap(query, c?.lat, c?.lon, ctrl.signal)
      if (ctrl.signal.aborted) return
      setLoading(false)
      setResults((res ?? []).slice(0, 8))
      setActive(0)
    }, 250)
    return () => {
      ctrl.abort()
      window.clearTimeout(timer)
    }
  }, [query, hasIndex, text === null, !!coords])

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setText(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  const pick = (r: MapSearchResult) => {
    const kind = placeKindName(r.kind, locale)
    const name = r.name || kind || ''
    const label = [name, r.city && r.cls !== 'place' ? r.city : null].filter(Boolean).join(', ')
    onPick({ lat: r.lat, lon: r.lon, label, zoom: searchZoom(r.cls, r.kind) })
    setText(null)
  }

  const pickCoords = () => {
    if (!coords) return
    onPick({ lat: coords.lat, lon: coords.lng, label: t('routes.point', { coords: `${coords.lat}, ${coords.lng}` }), zoom: 15 })
    setText(null)
  }

  return (
    <div ref={boxRef} className="relative min-w-0 flex-1">
      <input
        type="text"
        value={text ?? value ?? ''}
        placeholder={placeholder}
        onFocus={(e) => {
          setText('')
          e.target.select()
        }}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') setText(null)
          else if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActive((i) => Math.min(i + 1, Math.max(results.length - 1, 0)))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActive((i) => Math.max(i - 1, 0))
          } else if (e.key === 'Enter') {
            if (coords) pickCoords()
            else if (results[active]) pick(results[active])
          }
        }}
        className={`w-full truncate rounded border px-2 py-1 text-sm focus:border-desert-green focus:outline-none ${
          value ? 'border-border-default text-text-primary' : 'border-dashed border-border-default'
        } bg-surface-primary placeholder:text-text-muted`}
      />
      {text !== null && (coords || loading || results.length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded border border-border-default bg-surface-primary shadow-lg">
          {coords && (
            <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={pickCoords} className="block w-full px-2 py-1.5 text-left text-sm hover:bg-surface-secondary">
              {t('mapsUi.goToCoords', { coords: `${coords.lat}, ${coords.lng}` })}
            </button>
          )}
          {!coords && loading && results.length === 0 && (
            <div className="flex items-center gap-2 px-2 py-1.5 text-sm text-text-muted">
              <IconLoader2 size={14} className="animate-spin" /> {t('mapsUi.searching')}
            </div>
          )}
          {!coords &&
            results.map((r, i) => {
              const kind = placeKindName(r.kind, locale)
              const sub = [r.name ? kind : null, r.address, r.city].filter(Boolean).join(' · ')
              return (
                <button
                  key={r.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => pick(r)}
                  className={`block w-full px-2 py-1.5 text-left ${i === active ? 'bg-surface-secondary' : ''}`}
                >
                  <span className="block truncate text-sm text-text-primary">{r.name || kind}</span>
                  {sub && <span className="block truncate text-xs text-text-muted">{sub}</span>}
                </button>
              )
            })}
        </div>
      )}
    </div>
  )
}
