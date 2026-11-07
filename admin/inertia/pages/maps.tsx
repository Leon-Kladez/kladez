import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'

import MapsLayout from '~/layouts/MapsLayout'
import MapComponent from '~/components/maps/MapComponent'
import StyledButton from '~/components/StyledButton'
import { IconArrowLeft, IconCrosshair, IconMapPin, IconPlaneTilt } from '@tabler/icons-react'
import { FileEntry } from '../../types/files'
import Alert from '~/components/Alert'
import { t } from '../../constants/i18n'
import { useDevice } from '~/hooks/useDevice'

type MapCommand = {
  id: number
  lat: number
  lng: number
  action: 'fly' | 'marker'
}

export default function Maps(props: {
  maps: {
    baseAssetsExist: boolean
    worldBasemapExists: boolean
    regionFiles: FileEntry[]
    startBounds?: [number, number, number, number] | null
  }
}) {
  const [isHoveringUI, setIsHoveringUI] = useState(false)
  const { canChange } = useDevice()

  const [coordinateSearch, setCoordinateSearch] = useState('')
  const [mapCommand, setMapCommand] = useState<MapCommand | null>(null)
  const [showCoordinatesEnabled, setShowCoordinatesEnabled] = useState(true)

  const parseCoordinates = () => {
    const [latRaw, lngRaw] = coordinateSearch.split(',').map((value) => value.trim())
    const lat = Number(latRaw)
    const lng = Number(lngRaw)

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng) ||
      lat < -90 ||
      lat > 90 ||
      lng < -180 ||
      lng > 180
    ) {
      return null
    }

    return { lat, lng }
  }

  const handleCoordinateAction = (action: 'fly' | 'marker') => {
    const coordinates = parseCoordinates()
    if (!coordinates) return

    setMapCommand({
      id: Date.now(),
      ...coordinates,
      action,
    })
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
            <input
              type="text"
              placeholder={t('mapsPage.coordsPlaceholder')}
              value={coordinateSearch}
              onChange={(event) => setCoordinateSearch(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleCoordinateAction('fly')
              }}
              className="w-0 flex-1 min-w-[8rem] sm:flex-none sm:w-52 rounded border border-border-default bg-surface-primary px-2 py-1 text-sm text-text-primary placeholder:text-text-muted focus:border-desert-green focus:outline-none"
            />

            <button
              type="button"
              onClick={() => handleCoordinateAction('fly')}
              className="rounded border border-border-default bg-surface-primary p-2 text-text-secondary hover:bg-surface-secondary"
              title={t('mapsPage.flyTo')}
            >
              <IconPlaneTilt size={18}/>
            </button>

            {canChange && (
            <button
              type="button"
              onClick={() => handleCoordinateAction('marker')}
              className="rounded border border-border-default bg-surface-primary p-2 text-text-secondary hover:bg-surface-secondary"
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
            mapCommand={mapCommand}
            isHoveringUI={isHoveringUI}
            showCoordinatesEnabled={showCoordinatesEnabled}
          />
        </div>
      </div>
    </MapsLayout>
  )
}
