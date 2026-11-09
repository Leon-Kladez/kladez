import { Popup } from 'react-map-gl/maplibre'

import type { PlaceInfo } from '~/lib/map_place_info'
import { t } from '../../../constants/i18n'

type PlaceInfoPopupProps = {
  longitude: number
  latitude: number
  info: PlaceInfo
  onClose: () => void
  onAddMarker: () => void
  onMouseEnter?: () => void
}

/** Кладезъ: что это за место — по нажатию на значок или дом. */
export default function PlaceInfoPopup({
  longitude,
  latitude,
  info,
  onClose,
  onAddMarker,
  onMouseEnter,
}: PlaceInfoPopupProps) {
  return (
    <Popup
      longitude={longitude}
      latitude={latitude}
      anchor="bottom"
      offset={[0, -12] as [number, number]}
      onClose={onClose}
      closeOnClick={false}
      closeButton={false}
      maxWidth="280px"
    >
      <div
        className="max-w-[260px]"
        onMouseEnter={onMouseEnter}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="text-sm font-semibold break-words text-gray-900">{info.title}</div>
        {info.kind && <div className="text-xs text-gray-600">{info.kind}</div>}
        {info.house && (
          <div className="mt-1 text-xs text-gray-700">
            {t('mapsUi.house')} {info.house}
          </div>
        )}
        {info.street && (
          <div className="mt-1 text-xs text-gray-700">
            {t('mapsUi.nearStreet')}: {info.street}
          </div>
        )}

        <div className="mt-2 flex justify-end gap-1.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded bg-[#424420] px-2.5 py-1 text-xs text-white hover:bg-[#525530] border-none outline-none"
          >
            {t('common.close')}
          </button>
          <button
            type="button"
            onClick={onAddMarker}
            className="rounded bg-[#424420] px-2.5 py-1 text-xs text-white hover:bg-[#525530] border-none outline-none"
          >
            {t('mapsUi.addMarkerHere')}
          </button>
        </div>
      </div>
    </Popup>
  )
}
