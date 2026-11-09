import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'

import MapsLayout from '~/layouts/MapsLayout'
import MapComponent from '~/components/maps/MapComponent'
import StyledButton from '~/components/StyledButton'
import { IconArrowLeft, IconCrosshair, IconMapPin } from '@tabler/icons-react'
import MapSearchBox, { type MapSearchPick } from '~/components/maps/MapSearchBox'
import { FileEntry } from '../../types/files'
import Alert from '~/components/Alert'
import { t } from '../../constants/i18n'
import { useDevice } from '~/hooks/useDevice'

type MapCommand = {
  id: number
  lat: number
  lng: number
  action: 'fly' | 'marker'
  zoom?: number
  place?: { title: string; kind: string | null; house: string | null; street: string | null; address?: string | null }
}

export default function Maps(props: {
  maps: {
    baseAssetsExist: boolean
    worldBasemapExists: boolean
    regionFiles: FileEntry[]
    startBounds?: [number, number, number, number] | null
    /** Регионы со скачанным указателем поиска. */
    searchRegions?: string[]
  }
}) {
  const [isHoveringUI, setIsHoveringUI] = useState(false)
  const { canChange } = useDevice()

  const [mapCommand, setMapCommand] = useState<MapCommand | null>(null)
  const [showCoordinatesEnabled, setShowCoordinatesEnabled] = useState(true)
  // Кладезъ: последнее найденное — туда же ставится метка кнопкой рядом с поиском.
  const [lastPick, setLastPick] = useState<MapSearchPick | null>(null)
  const hasSearchIndex = (props.maps.searchRegions ?? []).length > 0

  const handlePick = (pick: MapSearchPick) => {
    setLastPick(pick)
    setMapCommand({
      id: Date.now(),
      lat: pick.lat,
      lng: pick.lng,
      action: 'fly',
      zoom: pick.zoom,
      place: { title: pick.title, kind: pick.kind, house: null, street: null, address: pick.address },
    })
  }

  const handleMarkerAtPick = () => {
    if (!lastPick) return
    setMapCommand({ id: Date.now(), lat: lastPick.lat, lng: lastPick.lng, action: 'marker' })
  }

  const alertMessage = !props.maps.baseAssetsExist
    ? t('mapsPage.noBaseAssets')
    : !props.maps.worldBasemapExists
    ? t('mapsPage.noWorldBasemap')
    : props.maps.regionFiles.length === 0
    ? t('mapsPage.noRegions')
    : null

  return (
    <MapsLayout>
      <Head title={t('home.tiles.maps.title')} />

      <div className="relative w-full h-screen overflow-hidden">
        {/* Navbar + alert. На узком экране (телефон) кнопки переносятся на вторую строку. */}
        <div className="absolute top-0 left-0 right-0 z-50 flex flex-col">
        <div
          className="flex flex-wrap items-center justify-between gap-2 p-4 bg-surface-secondary backdrop-blur-sm shadow-sm"
          onMouseEnter={() => setIsHoveringUI(true)}
          onMouseLeave={() => setIsHoveringUI(false)}
        >
          <Link href="/home" className="flex items-center" aria-label={t('nav.backToHome')}>
            <IconArrowLeft className="sm:mr-2" size={24} />
            <p className="hidden sm:block text-lg text-text-secondary">{t('nav.backToHome')}</p>
          </Link>

          <div className="flex flex-wrap items-center justify-end gap-2 min-w-0 flex-1">
            <MapSearchBox hasIndex={hasSearchIndex} canChange={canChange} onPick={handlePick} />

            {canChange && (
            <button
              type="button"
              onClick={handleMarkerAtPick}
              disabled={!lastPick}
              className="rounded border border-border-default bg-surface-primary p-2 text-text-secondary hover:bg-surface-secondary disabled:opacity-40"
              title={t('mapsPage.addMarker')}
            >
              <IconMapPin size={18}/>
            </button>
            )}

            <button
              type="button"
              onClick={() => setShowCoordinatesEnabled((prev) => !prev)}
              className={`rounded border border-border-default p-2 transition-colors ${
                showCoordinatesEnabled
                  ? 'bg-desert-green text-white'
                  : 'bg-surface-primary text-text-secondary hover:bg-surface-secondary'
              }`}
              title={showCoordinatesEnabled ? t('mapsPage.hideCoords') : t('mapsPage.showCoords')}
            >
              <IconCrosshair size={18}/>
            </button>

            {canChange && (
              <Link href="/settings/maps" className="sm:mr-4" aria-label={t('mapsPage.manageRegions')} title={t('mapsPage.manageRegions')}>
                {/* На телефоне — только значок, чтобы панель осталась в одну строку. */}
                <StyledButton variant="primary" icon="IconSettings">
                  <span className="hidden sm:inline">{t('mapsPage.manageRegions')}</span>
                </StyledButton>
              </Link>
            )}
          </div>
        </div>

        {/* Alert */}
        {alertMessage && (
          <div
            className="mx-4 mt-4"
            onMouseEnter={() => setIsHoveringUI(true)}
            onMouseLeave={() => setIsHoveringUI(false)}
          >
            <Alert
              title={alertMessage}
              type="warning"
              variant="solid"
              className="w-full"
              buttonProps={{
                variant: 'secondary',
                children: t('mapsPage.goToSettings'),
                icon: 'IconSettings',
                onClick: () => router.visit('/settings/maps'),
              }}
            />
          </div>
        )}
        </div>

        {/* Map */}

        <div className="absolute inset-0">
          <MapComponent
            startBounds={props.maps.startBounds ?? null}
            hasSearchIndex={hasSearchIndex}
            mapCommand={mapCommand}
            isHoveringUI={isHoveringUI}
            showCoordinatesEnabled={showCoordinatesEnabled}
          />
        </div>
      </div>
    </MapsLayout>
  )
}
