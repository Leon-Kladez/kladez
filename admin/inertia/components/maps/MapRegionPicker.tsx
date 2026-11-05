// Кладезъ, часть 3: выбор страны и (для России) федерального округа в два шага.
// Описание: docs/superpowers/specs/2026-11-05-kladez-3-maps-design.md, §5.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { IconArrowLeft, IconCheck, IconSearch } from '@tabler/icons-react'
import api from '~/lib/api'
import classNames from '~/lib/classNames'
import StyledModal from '~/components/StyledModal'
import StyledButton from '~/components/StyledButton'
import LoadingSpinner from '~/components/LoadingSpinner'
import DistrictSchema from './DistrictSchema'
import { formatBytes, t } from '../../../constants/i18n'
import { matchesQuery, packagesForCountry, restoreSelection, selectionSummary } from '../../../app/utils/map_picker'
import type { MapsSpec, SpecResource } from '../../../types/collections'

type Detail = 'full' | 'overview'
const DETAIL_MAXZOOM: Record<Detail, number> = { full: 15, overview: 13 }

export type MapRegionPickerProps =
  | { mode: 'modal'; onCancel: () => void; onDownloadStart?: (unavailable: string[]) => void }
  | {
      mode: 'inline'
      onChange: (ids: string[], bytes: number) => void
      /** Уже выбранные id — при возврате к шагу первой настройки выбор не теряется. */
      initialIds?: string[]
    }

export default function MapRegionPicker(props: MapRegionPickerProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['maps-picker'],
    queryFn: () => api.getMapPicker(),
    refetchOnWindowFocus: false,
  })
  const restored = restoreSelection(props.mode === 'inline' ? props.initialIds ?? [] : [])
  const [country, setCountry] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set(restored.selected))
  const [detail, setDetail] = useState<Detail>(restored.detail)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [onSiteBytes, setOnSiteBytes] = useState<number | null>(null)

  const resources = data?.resources ?? []
  const spec: MapsSpec = useMemo(
    () => ({ spec_version: '', collections: [{ name: '', slug: '', description: '', icon: '', language: 'ru', resources }] }),
    [resources]
  )
  const countries = useMemo(
    () => (data?.countries ?? []).filter((c) => matchesQuery(c, search)),
    [data, search]
  )
  const current = data?.countries.find((c) => c.code === country) ?? null
  const packages = country ? packagesForCountry(spec, country) : []
  const published = packages.filter((p) => !p.planned)
  const installed = new Set(data?.installed ?? [])
  // Выбор считается по всем опубликованным пакетам, а не только по открытой стране:
  // так восстановленный выбор (первая настройка) виден и до открытия страны.
  const chosen = resources.filter((r) => !r.planned && (r.detail ?? 'full') === 'full' && selected.has(r.id))
  const summary = selectionSummary(chosen, detail, resources, data?.freeBytes ?? null)

  // При возврате к шагу открываем страну уже выбранных пакетов.
  const restoredCountry = useRef(false)
  useEffect(() => {
    if (restoredCountry.current || !data || selected.size === 0) return
    restoredCountry.current = true
    const first = data.resources.find((r) => selected.has(r.id))
    if (first?.country) setCountry(first.country)
  }, [data, selected])

  // Во встроенном режиме (первая настройка) выбор отдаётся наружу; до загрузки списка — не трогаем.
  useEffect(() => {
    if (props.mode === 'inline' && data) props.onChange(summary.ids, summary.bytes)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, summary.ids.join(','), summary.bytes])

  useEffect(() => {
    setOnSiteBytes(null)
  }, [country, detail])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function downloadPackages() {
    if (summary.ids.length === 0) return setMessage(t('mapRegions.nothingSelected'))
    setBusy(true)
    setMessage(null)
    try {
      const res = await api.downloadMapPackages(summary.ids)
      if (!res) return // ошибку уже показало уведомление
      if (res.filenames.length > 0 && props.mode === 'modal') return props.onDownloadStart?.(res.unavailable)
      if (res.unavailable.length) setMessage(t('mapRegions.unavailable', { ids: res.unavailable.join(', ') }))
    } finally {
      setBusy(false)
    }
  }

  async function estimateOnSite() {
    if (!country) return
    setBusy(true)
    setMessage(null)
    try {
      // Ошибку (например, «нужен VPN») показывает уведомление; здесь — только результат.
      const res = await api.extractMapPreflight({ countries: [country], maxzoom: DETAIL_MAXZOOM[detail] })
      if (res) setOnSiteBytes(res.bytes)
    } finally {
      setBusy(false)
    }
  }

  async function downloadOnSite() {
    if (!country) return
    setBusy(true)
    setMessage(null)
    try {
      const res = await api.extractMapRegion({
        countries: [country],
        maxzoom: DETAIL_MAXZOOM[detail],
        label: current?.nameRu,
        estimatedBytes: onSiteBytes ?? undefined,
      })
      if (res && props.mode === 'modal') props.onDownloadStart?.([])
    } finally {
      setBusy(false)
    }
  }

  const freeText = data?.freeBytes != null ? formatBytes(data.freeBytes) : null
  const needsOnSite = country !== null && published.length === 0
  const onSiteFits = onSiteBytes === null || data?.freeBytes == null || onSiteBytes <= data.freeBytes

  const body = (
    <div className="space-y-4">
      {isLoading && (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      )}
      {isError && <p className="text-desert-red">{t('mapRegions.loadFailed')}</p>}

      {data && country === null && (
        <>
          <h3 className="text-xl font-semibold text-text-primary">{t('mapRegions.where')}</h3>
          <label className="flex items-center gap-2 rounded-md border border-border-default px-3 py-2">
            <IconSearch size={18} className="text-text-muted" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('mapRegions.search')}
              className="w-full bg-transparent outline-none"
              autoFocus
            />
          </label>
          <ul className="max-h-96 overflow-y-auto divide-y divide-border-subtle rounded-md border border-border-subtle">
            {countries.map((c) => (
              <li key={c.code}>
                <button
                  type="button"
                  onClick={() => {
                    setCountry(c.code)
                    setSelected(new Set())
                    setMessage(null)
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-surface-secondary"
                >
                  <span className="text-text-primary">{c.nameRu}</span>
                  {c.hasPackages && (
                    <span className="text-xs rounded-full bg-desert-green-lighter px-2 py-0.5 text-desert-green-dark">
                      {t('mapRegions.hasPackages')}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {data && country !== null && (
        <>
          <button
            type="button"
            onClick={() => setCountry(null)}
            className="flex items-center gap-1 text-sm text-desert-green underline"
          >
            <IconArrowLeft size={16} /> {t('mapRegions.back')}
          </button>
          <h3 className="text-xl font-semibold text-text-primary">{current?.nameRu}</h3>

          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t('mapRegions.detailLabel')}>
            {(['full', 'overview'] as Detail[]).map((d) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={detail === d}
                onClick={() => setDetail(d)}
                className={classNames(
                  'rounded-md border px-3 py-1.5 text-sm',
                  detail === d ? 'border-desert-green bg-desert-green text-white' : 'border-border-default'
                )}
              >
                {d === 'full' ? t('mapRegions.detailFull') : t('mapRegions.detailOverview')}
              </button>
            ))}
          </div>

          {packages.length > 0 && (
            <>
              {country === 'RU' && (
                <DistrictSchema
                  selected={selected}
                  onToggle={toggle}
                  titles={Object.fromEntries(packages.map((p) => [p.id, p.title]))}
                  enabled={new Set(published.map((p) => p.id))}
                />
              )}
              {published.length > 1 && (
                <label className="flex items-center gap-2 font-medium">
                  <input
                    type="checkbox"
                    checked={published.every((p) => selected.has(p.id))}
                    onChange={(e) => setSelected(e.target.checked ? new Set(published.map((p) => p.id)) : new Set())}
                  />
                  {t('mapRegions.wholeCountry')}
                </label>
              )}
              <ul className="space-y-2">
                {packages.map((p) => (
                  <PackageRow
                    key={p.id}
                    pkg={p}
                    detail={detail}
                    resources={resources}
                    checked={selected.has(p.id)}
                    installed={installed.has(p.id) || installed.has(`${p.id}-overview`)}
                    onToggle={() => toggle(p.id)}
                  />
                ))}
              </ul>
            </>
          )}

          {needsOnSite && (
            <div className="rounded-md border border-desert-orange-light bg-desert-orange-lighter/30 p-3 text-sm space-y-2">
              {packages.length > 0 && <p>{t('mapRegions.notPublishedHint')}</p>}
              {props.mode === 'modal' ? (
                <>
                  <p>{t('mapRegions.onSite')}</p>
                  <div className="flex flex-wrap items-center gap-3">
                    <StyledButton onClick={estimateOnSite} loading={busy} icon="IconRefresh">
                      {busy ? t('mapRegions.estimating') : t('mapRegions.estimate')}
                    </StyledButton>
                    {onSiteBytes !== null && (
                      <>
                        <span>
                          {freeText
                            ? t('mapRegions.summary', { size: formatBytes(onSiteBytes), free: freeText })
                            : t('mapRegions.summaryUnknownFree', { size: formatBytes(onSiteBytes) })}
                        </span>
                        <StyledButton
                          variant="primary"
                          onClick={downloadOnSite}
                          loading={busy}
                          disabled={!onSiteFits}
                          icon="IconDownload"
                        >
                          {t('mapRegions.download')}
                        </StyledButton>
                        {!onSiteFits && data?.freeBytes != null && onSiteBytes !== null && (
                          <span className="text-desert-red font-medium">
                            {t('mapRegions.missing', { missing: formatBytes(onSiteBytes - data.freeBytes) })}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p>{t('mapRegions.inlineOnSiteHint')}</p>
              )}
            </div>
          )}

          {published.length > 0 && (
            <div className="space-y-1 text-sm">
              {summary.ids.length > 0 && (
                <p className="text-text-secondary">
                  {t('mapRegions.selectedCount', { count: summary.ids.length })}.{' '}
                  {freeText
                    ? t('mapRegions.summary', { size: formatBytes(summary.bytes), free: freeText })
                    : t('mapRegions.summaryUnknownFree', { size: formatBytes(summary.bytes) })}
                </p>
              )}
              {summary.noOverview.length > 0 && (
                <p className="text-text-muted">{t('mapRegions.noOverview')}</p>
              )}
              {!summary.enough && (
                <p className="text-desert-red font-medium">
                  {t('mapRegions.missing', { missing: formatBytes(summary.missingBytes) })}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {message && <p className="text-desert-red text-sm">{message}</p>}
    </div>
  )

  if (props.mode === 'inline') return body

  const canDownload = published.length > 0 && summary.ids.length > 0 && summary.enough
  return (
    <StyledModal
      title={t('mapRegions.title')}
      open={true}
      onCancel={props.onCancel}
      onConfirm={published.length > 0 ? downloadPackages : undefined}
      confirmText={published.length > 0 ? t('mapRegions.download') : undefined}
      confirmIcon="IconDownload"
      confirmVariant="primary"
      confirmLoading={busy}
      confirmDisabled={!canDownload}
      cancelText={t('common.cancel')}
      large
    >
      {body}
    </StyledModal>
  )
}

function PackageRow(props: {
  pkg: SpecResource
  detail: Detail
  resources: SpecResource[]
  checked: boolean
  installed: boolean
  onToggle: () => void
}) {
  const { pkg, detail, resources, checked, installed, onToggle } = props
  const shown = selectionSummary([pkg], detail, resources, null)
  const disabled = !!pkg.planned
  return (
    <li>
      <label
        className={classNames(
          'flex items-start gap-3 rounded-md border px-3 py-2',
          checked ? 'border-desert-green' : 'border-border-subtle',
          disabled ? 'opacity-60' : 'cursor-pointer'
        )}
      >
        <input type="checkbox" checked={checked} disabled={disabled} onChange={onToggle} className="mt-1" />
        <span className="flex-1">
          <span className="flex items-center justify-between gap-2">
            <span className="font-medium text-text-primary">{pkg.title}</span>
            <span className="text-sm text-text-muted whitespace-nowrap">{formatBytes(shown.bytes)}</span>
          </span>
          {pkg.contents && <span className="block text-xs text-text-muted">{pkg.contents}</span>}
          {disabled && <span className="block text-xs text-desert-orange-dark">{t('mapRegions.notPublished')}</span>}
          {installed && (
            <span className="mt-1 inline-flex items-center gap-1 text-xs text-desert-green">
              <IconCheck size={14} /> {t('mapRegions.installed')}
            </span>
          )}
        </span>
      </label>
    </li>
  )
}
