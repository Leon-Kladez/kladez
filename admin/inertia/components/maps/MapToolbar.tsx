import { IconCrosshair, IconCurrentLocation, IconInfoCircle, IconMapPinPlus, IconRoute, IconStack2 } from '@tabler/icons-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { t } from '../../../constants/i18n'

export type MapTool = 'info' | 'marker'
/** Вид карты: схема (без интернета) или спутник (с интернетом). */
export type MapLayerKind = 'map' | 'satellite'

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
  layer: MapLayerKind
  onLayer: (layer: MapLayerKind) => void
  labels: boolean
  onLabels: (labels: boolean) => void
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

function LayerChoice(props: { checked: boolean; title: string; note: string; onPick: () => void }) {
  return (
    <label className="flex cursor-pointer items-start gap-2 rounded px-2 py-1.5 hover:bg-surface-secondary">
      <input type="radio" name="kz-map-layer" className="mt-1" checked={props.checked} onChange={props.onPick} />
      <span>
        <span className="block text-sm font-medium text-text-primary">{props.title}</span>
        <span className="block text-xs text-text-secondary">{props.note}</span>
      </span>
    </label>
  )
}

/** Кладезъ: меню карты справа — «Что здесь?», маршрут, метки, где я, координаты, слои. */
export default function MapToolbar(props: Props) {
  const [layersOpen, setLayersOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  // Окно слоёв закрывается нажатием мимо него.
  useEffect(() => {
    if (!layersOpen) return
    const onDown = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setLayersOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [layersOpen])

  return (
    <div ref={boxRef} className="relative" onMouseEnter={props.onMouseEnter} onMouseLeave={props.onMouseLeave}>
      <div className="flex flex-col overflow-visible rounded-lg border border-border-default bg-surface-primary shadow-md">
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
        <ToolButton active={layersOpen || props.layer !== 'map'} label={t('mapsUi.tool.layers')} onClick={() => setLayersOpen((v) => !v)}>
          <IconStack2 size={20} />
        </ToolButton>
      </div>

      {layersOpen && (
        <div
          role="dialog"
          aria-label={t('mapsUi.layer.title')}
          className="absolute bottom-0 right-12 w-72 rounded-lg border border-border-default bg-surface-primary p-2 shadow-lg"
        >
          <p className="px-2 pb-1 text-xs font-semibold uppercase tracking-wide text-text-secondary">{t('mapsUi.layer.title')}</p>
          <LayerChoice
            checked={props.layer === 'map'}
            title={t('mapsUi.layer.map')}
            note={t('mapsUi.layer.mapNote')}
            onPick={() => props.onLayer('map')}
          />
          <LayerChoice
            checked={props.layer === 'satellite'}
            title={t('mapsUi.layer.satellite')}
            note={t('mapsUi.layer.satelliteNote')}
            onPick={() => props.onLayer('satellite')}
          />
          {props.layer === 'satellite' && (
            <label className="mt-1 flex cursor-pointer items-center gap-2 border-t border-border-default px-2 pt-2 text-sm text-text-primary">
              <input type="checkbox" checked={props.labels} onChange={(e) => props.onLabels(e.target.checked)} />
              {t('mapsUi.layer.labels')}
            </label>
          )}
        </div>
      )}
    </div>
  )
}
