import Map, {
  FullscreenControl,
  Layer,
  Marker,
  Source,
  MapProvider,
  NavigationControl,
  ScaleControl,
} from 'react-map-gl/maplibre'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import { Protocol } from 'pmtiles'
import { useCallback, useEffect, useRef, useState } from 'react'

import { useMapMarkers } from '~/hooks/useMapMarkers'

import MarkerPin from './MarkerPin'
import MarkerPanel from './MarkerPanel'
import CoordinateOverlay from './CoordinateOverlay'
import ViewMapMarkerPopup from './ViewMapMarkerPopup'
import MapMarkerFormPopup from './MapMarkerFormPopup'
import ScaleUnitToggle from './ScaleUnitSelector'
import PlaceInfoPopup from './PlaceInfoPopup'
import { registerPlaceIcons } from './place_icons_draw'
import { shortPlaceLabel, type PlaceInfo } from '~/lib/map_place_info'
import { placeAt } from './place_query'
import { setLiveMapCenter } from '~/lib/map_search_ui'
import { t } from '../../../constants/i18n'
import api from '~/lib/api'
import type { RouteResult } from '../../../app/utils/map_route'
import type { RouteEnd } from './RoutePanel'

type ScaleUnit = 'imperial' | 'metric' | 'nautical'

type MapCommand = {
  id: number
  lat: number
  lng: number
  action: 'fly' | 'marker'
  /** Кладезъ: масштаб для найденного поиском (город, улица, дом). */
  zoom?: number
  /** Кладезъ: что найдено — показать подсказку на месте. */
  place?: PlaceInfo
}

type MapComponentProps = {
  mapCommand?: MapCommand | null
  isHoveringUI?: boolean
  showCoordinatesEnabled?: boolean
  /** Границы скачанных регионов [запад, юг, восток, север] — карта открывается на них. */
  startBounds?: [number, number, number, number] | null
  /** Кладезъ: скачан ли указатель поиска (тогда в подсказке — точный адрес). */
  hasSearchIndex?: boolean
  /** Кладезъ: маршрут — линия, точки, выбор точки нажатием на карту. */
  route?: RouteResult | null
  routeEnds?: { from: RouteEnd | null; to: RouteEnd | null }
  routePickMode?: 'from' | 'to' | null
  onRoutePoint?: (which: 'from' | 'to', end: RouteEnd) => void
}

type MapLocationParams = {
  lat: number
  lng: number
  zoom: number
}

// Кладезъ: свой ключ — вид, запомненный в NOMAD (США), не подхватываем.
const SAVED_MAP_VIEW_KEY = 'kladez:map-view'
// Без скачанных регионов карта открывается на Европе и России.
const DEFAULT_MAP_VIEW = { longitude: 55, latitude: 57, zoom: 2.6 }

type SavedMapView = { longitude: number; latitude: number; zoom: number }

const getMapLocationParams = (): MapLocationParams | null => {
  const params = new URLSearchParams(window.location.search)

  const latParam = params.get('lat')
  const lngParam = params.get('lng')
  const longParam = params.get('long')
  const rawLng = lngParam ?? longParam

  // Both coordinates must actually be present. Coercing a missing param instead
  // yields Number(null) === 0, which passes every bounds check below and flies
  // the map to 0,0 on a plain visit to /maps -- overriding the restored view and
  // then persisting Null Island back over it via onMoveEnd.
  if (!latParam || !rawLng) return null

  const lat = Number(latParam)
  const lng = Number(rawLng)
  const zoomParam = params.get('zoom')
  const zoom = zoomParam ? Number(zoomParam) : 12

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

  if (!lngParam && longParam) {
    params.set('lng', longParam)
    params.delete('long')

    const query = params.toString()
    window.history.replaceState(
      null,
      '',
      `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`
    )
  }

  return {
    lat,
    lng,
    zoom: Number.isFinite(zoom) ? zoom : 12,
  }
}

// Restore the last map position/zoom from localStorage so a refresh of /maps doesn't snap back
// to the default US-wide view. Bounds-checked so a corrupt or out-of-range value falls through
// to the default instead of throwing.
const getSavedMapView = (): SavedMapView | null => {
  try {
    const raw = localStorage.getItem(SAVED_MAP_VIEW_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (
      parsed &&
      typeof parsed === 'object' &&
      Number.isFinite(parsed.longitude) &&
      Number.isFinite(parsed.latitude) &&
      Number.isFinite(parsed.zoom) &&
      parsed.latitude >= -90 &&
      parsed.latitude <= 90 &&
      parsed.longitude >= -180 &&
      parsed.longitude <= 180
    ) {
      return { longitude: parsed.longitude, latitude: parsed.latitude, zoom: parsed.zoom }
    }
  } catch {
    // ignore — fall through to default
  }
  return null
}

const isValidMarkerCoordinate = (marker: { longitude: number; latitude: number }) =>
  Number.isFinite(marker.longitude) &&
  Number.isFinite(marker.latitude) &&
  marker.longitude >= -180 &&
  marker.longitude <= 180 &&
  marker.latitude >= -90 &&
  marker.latitude <= 90
export default function MapComponent({
                                       mapCommand,
                                       isHoveringUI = false,
                                       showCoordinatesEnabled = true,
                                       startBounds = null,
                                       hasSearchIndex = false,
                                       route = null,
                                       routeEnds,
                                       routePickMode = null,
                                       onRoutePoint,
                                     }: MapComponentProps) {
  const mapRef = useRef<MapRef>(null)
  const animationFrameRef = useRef<number | null>(null)
  const handledMapCommandIdRef = useRef<number | null>(null)

  const { markers, addMarker, updateMarker, deleteMarker } = useMapMarkers()

  const [targetIndicator, setTargetIndicator] = useState<{ lng: number; lat: number } | null>(null)
  const [isDraggingMap, setIsDraggingMap] = useState(false)
  const [placingMarker, setPlacingMarker] = useState<{ lng: number; lat: number } | null>(null)
  const [selectedMarkerId, setSelectedMarkerId] = useState<number | null>(null)
  const [editingMarkerId, setEditingMarkerId] = useState<number | null>(null)
  const [hasUnsavedMarkerChanges, setHasUnsavedMarkerChanges] = useState(false)
  const [showCoordinates, setShowCoordinates] = useState(false)
  const [placeInfo, setPlaceInfo] = useState<{ lng: number; lat: number; info: PlaceInfo } | null>(null)
  const [hoverPlaceLabel, setHoverPlaceLabel] = useState<string | null>(null)
  // Кладезъ: пока карта рисуется в первый раз — «Загружаю карту…», а не пустой серый экран.
  const [mapReady, setMapReady] = useState(false)
  useEffect(() => {
    // Запасной выход: если «готово» почему-то не пришло — не держим надпись вечно.
    const timer = window.setTimeout(() => setMapReady(true), 30000)
    return () => window.clearTimeout(timer)
  }, [])
  const unregisterIconsRef = useRef<(() => void) | null>(null)

  // Значки мест kz-* рисуются по запросу карты — подключаемся, как только карта создана,
  // до загрузки первых кусочков карты.
  const setMapRef = useCallback((ref: MapRef | null) => {
    ;(mapRef as { current: MapRef | null }).current = ref
    if (ref && !unregisterIconsRef.current) {
      unregisterIconsRef.current = registerPlaceIcons(ref.getMap())
    }
  }, [])

  useEffect(() => () => unregisterIconsRef.current?.(), [])

  // Кладезъ: новый маршрут — показать целиком.
  useEffect(() => {
    if (!route) return
    const [w, s, e, n] = route.bounds
    mapRef.current?.fitBounds(
      [
        [w, s],
        [e, n],
      ],
      { padding: { top: 120, bottom: 60, left: 380, right: 60 }, duration: 1200, maxZoom: 17 }
    )
  }, [route])

  const getInitialScaleUnit = (): ScaleUnit => {
    const stored = localStorage.getItem('nomad:map-scale-unit')

    return stored === 'metric' || stored === 'imperial' || stored === 'nautical'
      ? stored
      : 'metric'
  }

  const [scaleUnit, setScaleUnit] = useState<ScaleUnit>(getInitialScaleUnit)

  // Resolve the initial view once at mount: saved view → default. Lazy so it isn't recomputed
  // on every render.
  // Порядок: запомненный вид → скачанные регионы → Европа и Россия.
  const [initialViewState] = useState(
    () =>
      getSavedMapView() ??
      (startBounds
        ? {
            bounds: [
              [startBounds[0], startBounds[1]],
              [startBounds[2], startBounds[3]],
            ] as [[number, number], [number, number]],
            fitBoundsOptions: { padding: 24 },
          }
        : DEFAULT_MAP_VIEW)
  )

  const [cursorLngLat, setCursorLngLat] = useState<{
    lng: number
    lat: number
    x: number
    y: number
  } | null>(null)

  const hideCoordinates = useCallback(() => {
    setShowCoordinates(false)
    setCursorLngLat(null)
    setHoverPlaceLabel(null)
  }, [])

  const flyToLocationParams = useCallback(() => {
    const location = getMapLocationParams()
    if (!location) return

    mapRef.current?.flyTo({
      center: [location.lng, location.lat],
      zoom: location.zoom,
      duration: 1500,
    })
  }, [])

  const confirmDiscardMarkerChanges = useCallback(() => {
    if (!hasUnsavedMarkerChanges) return true
    return window.confirm(t('pins.discardConfirm'))
  }, [hasUnsavedMarkerChanges])

  useEffect(() => {
    const protocol = new Protocol()
    maplibregl.addProtocol('pmtiles', protocol.tile)

    return () => {
      maplibregl.removeProtocol('pmtiles')
    }
  }, [])

  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!mapCommand) return
    if (handledMapCommandIdRef.current === mapCommand.id) return

    handledMapCommandIdRef.current = mapCommand.id

    if (mapCommand.action === 'fly') {
      const currentZoom = mapRef.current?.getZoom() ?? 12

      setTargetIndicator({
        lng: mapCommand.lng,
        lat: mapCommand.lat,
      })

      mapRef.current?.flyTo({
        center: [mapCommand.lng, mapCommand.lat],
        zoom: mapCommand.zoom ?? currentZoom,
        duration: 1500,
      })

      if (mapCommand.place) {
        setPlacingMarker(null)
        setSelectedMarkerId(null)
        setPlaceInfo({ lng: mapCommand.lng, lat: mapCommand.lat, info: mapCommand.place })
      }

      return
    }

    if (mapCommand.action === 'marker') {
      if (!confirmDiscardMarkerChanges()) return

      setTargetIndicator(null)

      const currentZoom = mapRef.current?.getZoom() ?? 12

      mapRef.current?.flyTo({
        center: [mapCommand.lng, mapCommand.lat],
        zoom: currentZoom,
        duration: 750,
      })

      window.setTimeout(() => {
        setPlacingMarker({
          lng: mapCommand.lng,
          lat: mapCommand.lat,
        })

        setSelectedMarkerId(null)
        setEditingMarkerId(null)
        setHasUnsavedMarkerChanges(false)
      }, 750)
    }
  }, [mapCommand, confirmDiscardMarkerChanges])

  useEffect(() => {
    if (!selectedMarkerId) return

    const marker = markers.find((existingMarker) => existingMarker.id === selectedMarkerId)

    if (!marker || marker.visible === false) {
      setSelectedMarkerId(null)
      setEditingMarkerId(null)
    }
  }, [markers, selectedMarkerId])

  const handleScaleUnitChange = useCallback((unit: ScaleUnit) => {
    setScaleUnit(unit)
    localStorage.setItem('nomad:map-scale-unit', unit)
  }, [])

  const handleMapLoad = useCallback(() => {
    const c = mapRef.current?.getCenter()
    if (c) setLiveMapCenter(c.lat, c.lng)
    flyToLocationParams()
  }, [flyToLocationParams])

  const handleMapClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!confirmDiscardMarkerChanges()) return

      // Кладезъ: выбирается точка маршрута — нажатие ставит её, без подсказок и меток.
      if (routePickMode && onRoutePoint) {
        const map = mapRef.current?.getMap()
        const info = map ? placeAt(map, e.point.x, e.point.y, false) : null
        onRoutePoint(routePickMode, {
          lat: e.lngLat.lat,
          lon: e.lngLat.lng,
          label: info ? shortPlaceLabel(info) : t('routes.point', { coords: `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}` }),
        })
        return
      }

      // Кладезъ: нажали на место или дом — сначала подсказка «что здесь», метка — кнопкой в ней.
      if (placeInfo) {
        // Нажатие мимо открытой подсказки — просто закрыть её.
        setPlaceInfo(null)
        return
      }
      const map = mapRef.current?.getMap()
      // Пустое место — тоже «что здесь»: координаты, маршрут отсюда/сюда, метка — по кнопке.
      const info =
        (map ? placeAt(map, e.point.x, e.point.y, true) : null) ??
        (!placingMarker
          ? {
              title: t('routes.point', { coords: `${e.lngLat.lat.toFixed(5)}, ${e.lngLat.lng.toFixed(5)}` }),
              kind: null,
              house: null,
              street: null,
            }
          : null)
      if (info && !placingMarker) {
        const at = { lng: e.lngLat.lng, lat: e.lngLat.lat }
        setPlaceInfo({ ...at, info })
        setSelectedMarkerId(null)
        setEditingMarkerId(null)
        setTargetIndicator(null)
        // Точный адрес — из указателя поиска, если он скачан (у дома в карте только номер).
        if (hasSearchIndex) {
          api.mapAddressAt(at.lat, at.lng).then((a) => {
            if (!a) return
            const address = [a.street, a.house].filter(Boolean).join(', ') + (a.city ? `, ${a.city}` : '')
            setPlaceInfo((cur) =>
              cur && cur.lat === at.lat && cur.lng === at.lng ? { ...cur, info: { ...cur.info, address } } : cur
            )
          })
        }
        return
      }

      setPlacingMarker({ lng: e.lngLat.lng, lat: e.lngLat.lat })
      setSelectedMarkerId(null)
      setEditingMarkerId(null)
      setHasUnsavedMarkerChanges(false)
      setTargetIndicator(null)
    },
    [confirmDiscardMarkerChanges, placingMarker, placeInfo, hasSearchIndex, routePickMode, onRoutePoint]
  )

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement | null

      if (
        isHoveringUI ||
        isDraggingMap ||
        target?.closest('.maplibregl-control-container, .maplibregl-ctrl, .maplibregl-popup')
      ) {
        hideCoordinates()
        return
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        // Кладезъ: при наведении — что это за место («Аптека «Ригла»», «Дом 5»).
        const map = mapRef.current?.getMap()
        const info = map ? placeAt(map, e.point.x, e.point.y, false) : null
        const label = info ? shortPlaceLabel(info) : null
        setHoverPlaceLabel(label)
        if (!showCoordinatesEnabled && !label) {
          setShowCoordinates(false)
          setCursorLngLat(null)
          return
        }
        setShowCoordinates(true)
        setCursorLngLat({
          lng: e.lngLat.lng,
          lat: e.lngLat.lat,
          x: e.point.x,
          y: e.point.y,
        })
      })
    },
    [hideCoordinates, isHoveringUI, isDraggingMap, showCoordinatesEnabled]
  )


  const handleFlyTo = useCallback((longitude: number, latitude: number) => {
    setTargetIndicator(null)
    mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 12, duration: 1500 })
  }, [])

  const handleDeleteMarker = useCallback(
    (id: number) => {
      if (selectedMarkerId === id) setSelectedMarkerId(null)
      if (editingMarkerId === id) setEditingMarkerId(null)

      deleteMarker(id)
    },
    [selectedMarkerId, editingMarkerId, deleteMarker]
  )

  const selectedMarker = selectedMarkerId
    ? markers.find((marker) => marker.id === selectedMarkerId && isValidMarkerCoordinate(marker))
    : null

  return (
    <MapProvider>
      <div
        style={{ position: 'relative', width: '100%', height: '100vh' }}
        onMouseLeave={() => {
          setIsDraggingMap(false)
          hideCoordinates()
        }}
        onMouseMoveCapture={(e) => {
          const target = e.target as HTMLElement | null

          if (
            target?.closest(
              '.maplibregl-control-container, .maplibregl-ctrl, .maplibregl-ctrl-group, .maplibregl-ctrl-scale'
            )
          ) {
            hideCoordinates()
          }
        }}
      >
        <Map
          ref={setMapRef}
          reuseMaps
          style={{ width: '100%', height: '100vh' }}
          cursor={isDraggingMap ? 'grabbing' : routePickMode ? 'copy' : hoverPlaceLabel ? 'pointer' : 'crosshair'}
          mapStyle={`${window.location.protocol}//${window.location.hostname}:${window.location.port}/api/maps/styles`}
          mapLib={maplibregl}
          // «Кладезъ»: подсказки кнопок карты на языке панели, а не «Zoom in».
          locale={{
            'NavigationControl.ZoomIn': t('mapsUi.zoomIn'),
            'NavigationControl.ZoomOut': t('mapsUi.zoomOut'),
            'NavigationControl.ResetBearing': t('mapsUi.resetBearing'),
            'FullscreenControl.Enter': t('mapsUi.fullscreenEnter'),
            'FullscreenControl.Exit': t('mapsUi.fullscreenExit'),
            'GeolocateControl.FindMyLocation': t('mapsUi.findMe'),
            'ScaleControl.Meters': t('mapsUi.m'),
            'ScaleControl.Kilometers': t('mapsUi.km'),
          }}
          initialViewState={initialViewState}
          onMove={(e) => setLiveMapCenter(e.viewState.latitude, e.viewState.longitude)}
          onMoveEnd={(e) => {
            // Persist the view so a refresh restores where the user was, not the default.
            const { longitude, latitude, zoom } = e.viewState
            try {
              localStorage.setItem(
                SAVED_MAP_VIEW_KEY,
                JSON.stringify({ longitude, latitude, zoom })
              )
            } catch {
              // ignore persistence failures (private mode, quota)
            }
          }}
          onLoad={handleMapLoad}
          onIdle={() => setMapReady(true)}
          onMouseDown={() => {
            setIsDraggingMap(true)
            hideCoordinates()
          }}
          onMouseUp={() => {
            setIsDraggingMap(false)
          }}
          onDragStart={() => {
            setIsDraggingMap(true)
            hideCoordinates()
          }}
          onDragEnd={() => {
            setIsDraggingMap(false)
            hideCoordinates()
          }}
          onClick={handleMapClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={hideCoordinates}
        >
          <NavigationControl style={{ marginTop: '110px', marginRight: '36px' }} />
          <FullscreenControl style={{ marginTop: '30px', marginRight: '36px' }} />
          <ScaleControl position="bottom-left" maxWidth={150} unit={scaleUnit} />

          {!mapReady && (
            <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
              <div className="flex items-center gap-2 rounded-lg bg-surface-primary/90 px-4 py-2 text-sm font-medium text-text-primary shadow">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-desert-green border-t-transparent" />
                {t('mapsUi.loadingMap')}
              </div>
            </div>
          )}

          {showCoordinates && cursorLngLat && (
            <CoordinateOverlay
              latitude={cursorLngLat.lat}
              longitude={cursorLngLat.lng}
              x={cursorLngLat.x}
              y={cursorLngLat.y}
              label={hoverPlaceLabel}
              showCoords={showCoordinatesEnabled}
            />
          )}

          {route && (
            <Source
              id="kz-route"
              type="geojson"
              data={{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: route.line } }}
            >
              <Layer
                id="kz-route-casing"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{ 'line-color': '#ffffff', 'line-width': 9 }}
              />
              <Layer
                id="kz-route-line"
                type="line"
                layout={{ 'line-join': 'round', 'line-cap': 'round' }}
                paint={{
                  'line-color': route.mode === 'pedestrian' ? '#7c3aed' : route.mode === 'bicycle' ? '#15803d' : '#2563eb',
                  'line-width': 5,
                }}
              />
            </Source>
          )}

          {(['from', 'to'] as const).map((which) => {
            const end = routeEnds?.[which]
            if (!end) return null
            return (
              <Marker key={`route-${which}`} longitude={end.lon} latitude={end.lat} anchor="bottom">
                <div
                  className={`pointer-events-none flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-sm font-bold text-white shadow-lg ${
                    which === 'from' ? 'bg-green-700' : 'bg-red-700'
                  }`}
                >
                  {which === 'from' ? 'А' : 'Б'}
                </div>
              </Marker>
            )
          })}

          {targetIndicator && (
            <Marker longitude={targetIndicator.lng} latitude={targetIndicator.lat} anchor="center">
              <div
                className="pointer-events-none flex h-9 w-9 items-center justify-center rounded-full border-2 border-desert-orange bg-surface-primary/70 shadow-lg"
                aria-hidden="true"
              >
                <div className="relative h-5 w-5">
                  <div className="absolute left-1/2 top-0 h-full w-[2px] -translate-x-1/2 bg-desert-orange" />
                  <div className="absolute left-0 top-1/2 h-[2px] w-full -translate-y-1/2 bg-desert-orange" />
                </div>
              </div>
            </Marker>
          )}

          <ScaleUnitToggle
            scaleUnit={scaleUnit}
            onChange={handleScaleUnitChange}
            onMouseEnter={hideCoordinates}
          />

          {markers
            .filter((marker) => marker.visible)
            .map((marker) => (
              <Marker
                key={marker.id}
                longitude={marker.longitude}
                latitude={marker.latitude}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation()

                  if (!confirmDiscardMarkerChanges()) return

                  setSelectedMarkerId(marker.id === selectedMarkerId ? null : marker.id)
                  setPlacingMarker(null)
                  setEditingMarkerId(null)
                  setHasUnsavedMarkerChanges(false)
                  setTargetIndicator(null)
                }}
              >
                <MarkerPin
                  color={marker.color}
                  customColor={marker.customColor}
                  icon={marker.icon}
                  iconColor={marker.iconColor}
                  visible={marker.visible}
                  active={marker.id === selectedMarkerId}
                />
              </Marker>
            ))}

          {placeInfo && !placingMarker && (
            <PlaceInfoPopup
              longitude={placeInfo.lng}
              latitude={placeInfo.lat}
              info={placeInfo.info}
              onMouseEnter={hideCoordinates}
              onClose={() => setPlaceInfo(null)}
              onRouteFrom={
                onRoutePoint
                  ? () => {
                      onRoutePoint('from', { lat: placeInfo.lat, lon: placeInfo.lng, label: shortPlaceLabel(placeInfo.info) })
                      setPlaceInfo(null)
                    }
                  : undefined
              }
              onRouteTo={
                onRoutePoint
                  ? () => {
                      onRoutePoint('to', { lat: placeInfo.lat, lon: placeInfo.lng, label: shortPlaceLabel(placeInfo.info) })
                      setPlaceInfo(null)
                    }
                  : undefined
              }
              onAddMarker={() => {
                setPlacingMarker({ lng: placeInfo.lng, lat: placeInfo.lat })
                setPlaceInfo(null)
                setHasUnsavedMarkerChanges(false)
              }}
            />
          )}

          {placingMarker && (
            <MapMarkerFormPopup
              longitude={placingMarker.lng}
              latitude={placingMarker.lat}
              onDirtyChange={setHasUnsavedMarkerChanges}
              onMouseEnter={hideCoordinates}
              onSave={async ({ name, notes, color, customColor, icon }) => {
                const saved = await addMarker({
                  name,
                  longitude: placingMarker.lng,
                  latitude: placingMarker.lat,
                  color,
                  customColor,
                  icon,
                  notes: notes || null,
                })

                // Leave the popup open on failure. api.ts already surfaces the
                // error toast, but closing here would throw away what was typed
                // with nothing to retry against.
                if (!saved) return

                setPlacingMarker(null)
                setHasUnsavedMarkerChanges(false)
                setTargetIndicator(null)
              }}
              onCancel={() => {
                if (!confirmDiscardMarkerChanges()) return

                setPlacingMarker(null)
                setEditingMarkerId(null)
                setHasUnsavedMarkerChanges(false)
                setTargetIndicator(null)
              }}
            />
          )}

          {selectedMarker && editingMarkerId !== selectedMarker.id && (
            <ViewMapMarkerPopup
              marker={selectedMarker}
              onClose={() => setSelectedMarkerId(null)}
              onEdit={() => setEditingMarkerId(selectedMarker.id)}
              onMouseEnter={hideCoordinates}
            />
          )}

          {selectedMarker && editingMarkerId === selectedMarker.id && (
            <MapMarkerFormPopup
              longitude={selectedMarker.longitude}
              latitude={selectedMarker.latitude}
              initialMarker={selectedMarker}
              onDirtyChange={setHasUnsavedMarkerChanges}
              onMouseEnter={hideCoordinates}
              onSave={async ({ id, name, notes, color, customColor, icon }) => {
                if (!id) return

                const saved = await updateMarker(id, {
                  name,
                  notes: notes || null,
                  color,
                  customColor,
                  icon,
                })

                if (!saved) return

                setEditingMarkerId(null)
                setHasUnsavedMarkerChanges(false)
              }}
              onCancel={() => {
                if (!confirmDiscardMarkerChanges()) return

                setEditingMarkerId(null)
                setHasUnsavedMarkerChanges(false)
              }}
            />
          )}
        </Map>
      </div>

      <div onMouseEnter={hideCoordinates}>
        <MarkerPanel
          markers={markers}
          onDelete={handleDeleteMarker}
          onFlyTo={handleFlyTo}
          onSelect={setSelectedMarkerId}
          selectedMarkerId={selectedMarkerId}
          onToggleVisibility={(id, visible) => updateMarker(id, { visible })}
        />
      </div>
    </MapProvider>
  )
}
