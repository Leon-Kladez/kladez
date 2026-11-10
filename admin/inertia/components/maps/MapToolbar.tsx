import { IconCrosshair, IconCurrentLocation, IconInfoCircle, IconMapPinPlus, IconRoute } from '@tabler/icons-react'
import type { ReactNode } from 'react'

import { t } from '../../../constants/i18n'

export type MapTool = 'info' | 'marker'

type Props = {
  tool: MapTool
  onTool: (tool: MapTool) => void
  routeOpen: boolean
  onRoute: () => void
  onLocate: () => void
  locating: boolean
  showCoords: boolean
  onCoords: () => void
  canChange: boolean
  onMouseEnter?: () => void
  onMouseLeave?: () => void
}

function ToolButton(props: { active?: boolean; label: string; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      title={props.label}
      aria-label={props.label}
      aria-pressed={props.active}
      disabled={props.disabled}
      onClick={props.onClick}
      className={`group relative flex h-10 w-10 items-center justify-center border-b border-border-default last:border-b-0 transition-colors ${
        props.active ? 'bg-desert-green text-white' : 'bg-surface-primary text-text-secondary hover:bg-surface-secondary'
      } disabled:opacity-50`}
    >
      {props.children}
      {/* Подпись слева от кнопки при наведении — как на openstreetmap.org. */}
      <span className="pointer-events-none absolute right-12 top-1/2 hidden -translate-y-1/2 whitespace-nowrap rounded bg-black/80 px-2 py-1 text-xs text-white group-hover:block">
        {props.label}
      </span>
    </button>
  )
}

/** Кладезъ: меню карты справа — «Что здесь?», маршрут, метки, где я, координаты. */
export default function MapToolbar(props: Props) {
  return (
    <div
      className="flex flex-col overflow-visible rounded-lg border border-border-default bg-surface-primary shadow-md"
      onMouseEnter={props.onMouseEnter}
      onMouseLeave={props.onMouseLeave}
    >
      <ToolButton active={props.tool === 'info'} label={t('mapsUi.tool.info')} onClick={() => props.onTool('info')}>
        <IconInfoCircle size={20} />
      </ToolButton>
      <ToolButton active={props.routeOpen} label={t('mapsUi.tool.route')} onClick={props.onRoute}>
        <IconRoute size={20} />
      </ToolButton>
      {props.canChange && (
        <ToolButton active={props.tool === 'marker'} label={t('mapsUi.tool.marker')} onClick={() => props.onTool(props.tool === 'marker' ? 'info' : 'marker')}>
          <IconMapPinPlus size={20} />
        </ToolButton>
      )}
      <ToolButton label={t('mapsUi.tool.locate')} onClick={props.onLocate} disabled={props.locating}>
        <IconCurrentLocation size={20} className={props.locating ? 'animate-pulse' : ''} />
      </ToolButton>
      <ToolButton active={props.showCoords} label={t('mapsUi.tool.coords')} onClick={props.onCoords}>
        <IconCrosshair size={20} />
      </ToolButton>
    </div>
  )
}
