import { useEffect, useState } from 'react'
import {
  IconBuildingHospital,
  IconCash,
  IconDroplet,
  IconFlame,
  IconGasStation,
  IconLoader2,
  IconMapSearch,
  IconPill,
  IconRoute,
  IconShield,
  IconShoppingCart,
  IconX,
} from '@tabler/icons-react'

import api from '~/lib/api'
import type { NearbyPlace } from '../../../constants/nearby'
import { getLocale, t } from '../../../constants/i18n'
import { placeKindName } from '../../../constants/map_places'

const GROUP_ICON: Record<string, typeof IconPill> = {
  pharmacy: IconPill,
  medical: IconBuildingHospital,
  food: IconShoppingCart,
  water: IconDroplet,
  fuel: IconGasStation,
  money: IconCash,
  police: IconShield,
  fire: IconFlame,
}

type Props = {
  /** Откуда искать: «Где я» (GPS) или центр карты. */
  center: { lat: number; lon: number; mine: boolean }
  hasIndex: boolean
  onClose: () => void
  onShow: (place: NearbyPlace) => void
  onRouteTo: (place: NearbyPlace, label: string) => void
}

function distanceLabel(m: number): string {
  if (m < 1000) return `${m} ${t('mapsUi.m')}`
  const km = m < 10000 ? (m / 1000).toFixed(1) : String(Math.round(m / 1000))
  return `${getLocale() === 'ru' ? km.replace('.', ',') : km} ${t('mapsUi.km')}`
}

/**
 * «Кладезъ»: «Рядом» — ближайшие аптеки, больницы, продукты, питьевая вода, заправки, банкоматы,
 * полиция и пожарные, по три в группе, из скачанных указателей — без интернета.
 */
export default function NearbyPanel({ center, hasIndex, onClose, onShow, onRouteTo }: Props) {
  const locale = getLocale()
  const [groups, setGroups] = useState<{ id: string; places: NearbyPlace[] }[] | null>(null)

  useEffect(() => {
    let cancelled = false
    setGroups(null)
    if (!hasIndex) return
    api.mapNearby(center.lat, center.lon).then((g) => !cancelled && setGroups(g ?? []))
    return () => {
      cancelled = true
    }
  }, [center.lat, center.lon, hasIndex])

  const nameOf = (p: NearbyPlace) => p.name || placeKindName(p.kind, locale) || t('nearby.noName')

  return (
    <div className="flex max-h-[calc(100vh-9rem)] w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border border-border-default bg-surface-primary shadow-lg">
      <div className="flex items-center justify-between border-b border-border-default px-3 py-2">
        <div className="flex items-center gap-2 font-semibold text-text-primary">
          <IconMapSearch size={18} /> {t('nearby.title')}
        </div>
        <button type="button" onClick={onClose} title={t('routes.close')} className="rounded p-1 text-text-muted hover:text-text-primary">
          <IconX size={16} />
        </button>
      </div>
      <div className="flex flex-col gap-3 overflow-y-auto p-3 text-sm">
        <p className="text-xs text-text-muted">{center.mine ? t('nearby.fromMe') : t('nearby.fromCenter')}</p>
        {!hasIndex && <p className="text-text-secondary">{t('nearby.noIndex')}</p>}
        {hasIndex && groups === null && (
          <p className="flex items-center gap-2 text-text-muted">
            <IconLoader2 size={14} className="animate-spin" /> {t('mapsUi.searching')}
          </p>
        )}
        {groups?.map((g) => {
          const Icon = GROUP_ICON[g.id] ?? IconMapSearch
          return (
            <section key={g.id}>
              <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-text-secondary">
                <Icon size={14} aria-hidden="true" /> {t(`nearby.group.${g.id}` as 'nearby.group.pharmacy')}
              </h3>
              {g.places.length === 0 ? (
                <p className="text-xs text-text-muted">{t('nearby.none')}</p>
              ) : (
                <ul className="flex flex-col">
                  {g.places.map((p, i) => (
                    <li key={`${p.lat},${p.lon},${i}`} className="flex items-center gap-1 rounded hover:bg-surface-secondary">
                      <button type="button" onClick={() => onShow(p)} className="min-w-0 flex-1 px-1 py-1 text-left">
                        <span className="block truncate text-text-primary">{nameOf(p)}</span>
                        <span className="block truncate text-xs text-text-muted">
                          {distanceLabel(p.distanceM)}
                          {p.address ? ` · ${p.address}` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onRouteTo(p, nameOf(p))}
                        title={t('nearby.routeTo')}
                        aria-label={`${t('nearby.routeTo')}: ${nameOf(p)}`}
                        className="shrink-0 rounded p-1.5 text-desert-green hover:bg-surface-primary"
                      >
                        <IconRoute size={16} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )
        })}
      </div>
    </div>
  )
}
