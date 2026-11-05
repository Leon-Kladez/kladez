import { useQuery } from '@tanstack/react-query'
import api from '~/lib/api'
import { geometryToPath, SCHEMA_HEIGHT, SCHEMA_WIDTH } from '~/lib/district_schema'
import { t } from '../../../constants/i18n'

type Props = {
  /** id пакетов-округов, отмеченных сейчас. */
  selected: Set<string>
  onToggle: (id: string) => void
  /** Название округа по id — для подсказки при наведении. */
  titles: Record<string, string>
  /** Округа, которые можно отметить (опубликованные). */
  enabled: Set<string>
}

/** Схема федеральных округов России: щелчок по округу ставит или снимает отметку. Работает без сети. */
export default function DistrictSchema({ selected, onToggle, titles, enabled }: Props) {
  const { data } = useQuery({
    queryKey: ['maps-ru-districts-schema'],
    queryFn: () => api.getRuDistrictsSchema(),
    staleTime: Infinity,
  })
  if (!data) return null

  return (
    <figure className="rounded-lg border border-border-subtle bg-surface-secondary p-2">
      <svg
        viewBox={`0 0 ${SCHEMA_WIDTH} ${SCHEMA_HEIGHT}`}
        className="w-full h-auto"
        role="img"
        aria-label={t('mapRegions.schemaTitle')}
      >
        {data.features.map((f, i) => {
          const id = f.properties.id
          const isOn = selected.has(id)
          const canPick = enabled.has(id)
          return (
            <path
              key={`${id}-${i}`}
              d={geometryToPath(f.geometry as any)}
              fillRule="evenodd"
              className={
                isOn
                  ? 'fill-desert-green stroke-white cursor-pointer'
                  : canPick
                    ? 'fill-desert-stone-light stroke-white cursor-pointer hover:fill-desert-green-light'
                    : 'fill-border-subtle stroke-white'
              }
              strokeWidth={0.5}
              onClick={() => canPick && onToggle(id)}
            >
              <title>{titles[id] ?? id}</title>
            </path>
          )
        })}
      </svg>
      <figcaption className="text-xs text-text-muted text-center mt-1">{t('mapRegions.schemaTitle')}</figcaption>
    </figure>
  )
}
