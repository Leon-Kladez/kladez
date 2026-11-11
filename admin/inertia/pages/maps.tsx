import { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'

import MapsLayout from '~/layouts/MapsLayout'
import MapComponent from '~/components/maps/MapComponent'
import StyledButton from '~/components/StyledButton'
import { IconArrowLeft } from '@tabler/icons-react'
import RoutePanel, { type RouteEnd, type RouteEnds } from '~/components/maps/RoutePanel'
import HerePanel, { type HerePoint } from '~/components/maps/HerePanel'
import MapToolbar, { type MapLayerKind, type MapTool } from '~/components/maps/MapToolbar'
import type { RouteResult } from '../../app/utils/map_route'
import MapSearchBox, { type MapSearchPick } from '~/components/maps/MapSearchBox'
import { FileEntry } from '../../types/files'
import Alert from '~/components/Alert'
import { t } from '../../constants/i18n'
import { useDevice } from '~/hooks/useDevice'
import { useNotifications } from '~/context/NotificationContext'
import type { PlaceInfo } from '~/lib/map_place_info'

const MAP_LAYER_KEY = 'kladez:map-layer'
const MAP_LABELS_KEY = 'kladez:map-satellite-labels'

type MapCommand = {
  id: number
  lat: number
  lng: number
  action: 'fly' | 'marker'
  zoom?: number
  place?: PlaceInfo
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
  const { addNotification } = useNotifications()

  const [mapCommand, setMapCommand] = useState<MapCommand | null>(null)
  const [showCoordinatesEnabled, setShowCoordinatesEnabled] = useState(false)
  const hasSearchIndex = (props.maps.searchRegions ?? []).length > 0

  // Кладезъ: меню справа. По умолчанию — «Что здесь?»: нажатие показывает подробности слева.
  const [tool, setTool] = useState<MapTool>('info')
  // Слева — одна панель: «Что здесь?» или «Маршрут».
  const [leftPanel, setLeftPanel] = useState<'here' | 'route' | null>(null)
  const [here, setHere] = useState<HerePoint | null>(null)

  // Маршрут — точки А/Б, выбор точки на карте, готовая линия.
  const [routeEnds, setRouteEnds] = useState<RouteEnds>({ from: null, to: null })
  const [routePickMode, setRoutePickMode] = useState<'from' | 'to' | null>(null)
  const [route, setRoute] = useState<RouteResult | null>(null)

  // Вид карты: схема или спутник (с подписями или без) — запоминается в этом браузере.
  const [mapLayer, setMapLayer] = useState<MapLayerKind>(() => {
    try {
      return localStorage.getItem(MAP_LAYER_KEY) === 'satellite' ? 'satellite' : 'map'
    } catch {
      return 'map'
    }
  })
  const [satLabels, setSatLabels] = useState<boolean>(() => {
    try {
      return localStorage.getItem(MAP_LABELS_KEY) !== 'off'
    } catch {
      return true
    }
  })
  const chooseLayer = (layer: MapLayerKind) => {
    setMapLayer(layer)
    try {
      localStorage.setItem(MAP_LAYER_KEY, layer)
    } catch {}
    if (layer === 'satellite' && typeof navigator !== 'undefined' && navigator.onLine === false) {
      addNotification({ type: 'info', message: t('mapsUi.layer.offline'), duration: 8000 })
    }
  }
  const chooseLabels = (on: boolean) => {
    setSatLabels(on)
    try {
      localStorage.setItem(MAP_LABELS_KEY, on ? 'on' : 'off')
    } catch {}
  }

  // «Где я».
  const [myPosition, setMyPosition] = useState<{ lat: number; lon: number; accuracy?: number } | null>(null)
  const [locating, setLocating] = useState(false)

  const handleRoutePoint = (which: 'from' | 'to', end: RouteEnd) => {
    setLeftPanel('route')
    setRoute(null)
    setRouteEnds((cur) => ({ ...cur, [which]: end }))
    setRoutePickMode(null)
  }

  const showHere = (lat: number, lon: number, place: PlaceInfo | null) => {
    setHere({ lat, lon, place })
    setLeftPanel('here')
  }

  const handlePick = (pick: MapSearchPick) => {
    setMapCommand({ id: Date.now(), lat: pick.lat, lng: pick.lng, action: 'fly', zoom: pick.zoom })
    showHere(pick.lat, pick.lng, { title: pick.title, kind: pick.kind, house: null, street: null, address: pick.address })
  }

  const handleLocate = () => {
    // Браузер даёт место только защищённой странице (https или localhost).
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      addNotification({ type: 'info', message: t('mapsUi.locateNeedsHttps'), duration: 10000 })
      return
    }
    if (!navigator.geolocation) {
      addNotification({ type: 'info', message: t('mapsUi.locateUnavailable'), duration: 8000 })
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false)
        const p = { lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }
        setMyPosition(p)
        setMapCommand({ id: Date.now(), lat: p.lat, lng: p.lon, action: 'fly', zoom: 16 })
        showHere(p.lat, p.lon, { title: t('mapsUi.locateYou'), kind: null, house: null, street: null })
      },
      (err) => {
        setLocating(false)
        addNotification({
          type: 'info',
          message: err.code === err.PERMISSION_DENIED ? t('mapsUi.locateDenied') : t('mapsUi.locateUnavailable'),
          duration: 8000,
        })
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 }
    )
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
        {/* Верх: на главную, поиск, управление картами. Всё остальное — в меню справа. */}
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

        {/* Кладезъ: меню карты справа, под «+ / −» и «во весь экран». */}
        <div className="absolute right-[46px] top-[17rem] z-40">
          <MapToolbar
            tool={tool}
            onTool={(next) => {
              setTool(next)
              if (next === 'marker') addNotification({ type: 'info', message: t('mapsUi.markerModeHint'), duration: 6000 })
            }}
            routeOpen={leftPanel === 'route'}
            onRoute={() => {
              setLeftPanel((cur) => (cur === 'route' ? null : 'route'))
              setRoutePickMode(null)
            }}
            onLocate={handleLocate}
            locating={locating}
            showCoords={showCoordinatesEnabled}
            onCoords={() => setShowCoordinatesEnabled((v) => !v)}
            canChange={canChange}
            layer={mapLayer}
            onLayer={chooseLayer}
            labels={satLabels}
            onLabels={chooseLabels}
            onMouseEnter={() => setIsHoveringUI(true)}
            onMouseLeave={() => setIsHoveringUI(false)}
          />
        </div>

        {/* Слева под верхней панелью: «Что здесь?» или «Маршрут». */}
        {leftPanel && (
          <div
            className="absolute left-4 top-[6.5rem] z-40"
            onMouseEnter={() => setIsHoveringUI(true)}
            onMouseLeave={() => setIsHoveringUI(false)}
          >
            {leftPanel === 'here' && here && (
              <HerePanel
                here={here}
                hasIndex={hasSearchIndex}
                canChange={canChange}
                onClose={() => setLeftPanel(null)}
                onRouteFrom={(label) => handleRoutePoint('from', { lat: here.lat, lon: here.lon, label })}
                onRouteTo={(label) => handleRoutePoint('to', { lat: here.lat, lon: here.lon, label })}
                onAddMarker={() => {
                  setMapCommand({ id: Date.now(), lat: here.lat, lng: here.lon, action: 'marker' })
                  setLeftPanel(null)
                }}
              />
            )}
            {leftPanel === 'route' && (
              <RoutePanel
                ends={routeEnds}
                onEndsChange={setRouteEnds}
                pickMode={routePickMode}
                onPickMode={setRoutePickMode}
                route={route}
                onRoute={setRoute}
                onStepClick={(lon, lat) => setMapCommand({ id: Date.now(), lat, lng: lon, action: 'fly', zoom: 17 })}
                onFly={(lat, lon, zoom) => setMapCommand({ id: Date.now(), lat, lng: lon, action: 'fly', zoom })}
                hasSearchIndex={hasSearchIndex}
                onClose={() => {
                  setLeftPanel(null)
                  setRoutePickMode(null)
                }}
                canChange={canChange}
              />
            )}
          </div>
        )}

        {/* Map */}

        <div className="absolute inset-0">
          <MapComponent
            startBounds={props.maps.startBounds ?? null}
            hasSearchIndex={hasSearchIndex}
            route={route}
            routeEnds={routeEnds}
            routePickMode={routePickMode}
            onRoutePoint={handleRoutePoint}
            tool={tool}
            onHere={showHere}
            myPosition={myPosition}
            mapCommand={mapCommand}
            isHoveringUI={isHoveringUI}
            showCoordinatesEnabled={showCoordinatesEnabled}
            satellite={mapLayer === 'satellite' ? { labels: satLabels } : null}
            onSatelliteError={() => addNotification({ type: 'info', message: t('mapsUi.layer.offline'), duration: 8000 })}
          />
        </div>
      </div>
    </MapsLayout>
  )
}
