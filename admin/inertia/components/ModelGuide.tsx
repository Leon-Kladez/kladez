import { useEffect, useState } from 'react'
import { router } from '@inertiajs/react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import classNames from 'classnames'
import api, { type ModelGuideInfo, type ModelFitValue } from '~/lib/api'
import StyledButton from '~/components/StyledButton'
import RussianLanguageBadge from '~/components/RussianLanguageBadge'
import useOllamaModelDownloads from '~/hooks/useOllamaModelDownloads'
import { useNotifications } from '~/context/NotificationContext'
import { formatBytes } from '~/lib/util'
import { t } from '../../constants/i18n'

type Purpose = ModelGuideInfo['purpose']
const PURPOSES: Purpose[] = ['chat', 'code', 'images']

const FIT_STYLE: Record<ModelFitValue, string> = {
  'good': 'bg-desert-green-lighter text-desert-green-dark',
  'slow': 'bg-orange-100 text-orange-800',
  'too-big': 'bg-red-100 text-red-800',
}

/**
 * «Кладезъ»: «Какую модель выбрать» — по надобностям (общение, код, картинки), по 10 моделей от
 * лёгких к сильным. У каждой — потянет ли её этот компьютер; одна рекомендована. Скачивание с
 * процентами прямо в строке, потом — «Перейти в чат». Полный каталог Ollama — ниже на странице.
 */
export default function ModelGuide() {
  const [purpose, setPurpose] = useState<Purpose>('chat')
  const queryClient = useQueryClient()
  const { addNotification } = useNotifications()
  const { downloads } = useOllamaModelDownloads()
  const [starting, setStarting] = useState<Set<string>>(new Set())
  const { data } = useQuery({
    queryKey: ['model-guide', purpose],
    queryFn: () => api.getModelGuide(purpose),
  })

  // Скачалась — обновить список установленных (и подборку, и страницу).
  useEffect(() => {
    if (downloads.some((d) => d.percent >= 100)) {
      queryClient.invalidateQueries({ queryKey: ['model-guide'] })
      router.reload({ only: ['models'] })
    }
  }, [downloads])

  async function install(name: string) {
    setStarting((s) => new Set(s).add(name))
    const res = await api.downloadModel(name)
    if (!res?.success) {
      setStarting((s) => {
        const n = new Set(s)
        n.delete(name)
        return n
      })
      addNotification({ type: 'error', message: t('models.installFailed', { name }) })
    }
  }

  return (
    <section className="rounded-lg border-2 border-border-subtle bg-surface-primary p-4 sm:p-6" aria-labelledby="model-guide-title">
      <h2 id="model-guide-title" className="text-2xl font-semibold">{t('models.guide.title')}</h2>
      <p className="text-text-muted mt-1">{t('models.guide.intro')}</p>
      {data?.compute && (
        <p className="text-sm mt-2">
          {t(data.compute.gpu ? 'models.guide.computeGpu' : 'models.guide.computeCpu', {
            memory: data.compute.memoryGb,
            cpus: data.compute.cpus,
          })}
        </p>
      )}

      <div className="flex flex-wrap gap-2 mt-4" role="tablist">
        {PURPOSES.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={purpose === p}
            onClick={() => setPurpose(p)}
            className={classNames(
              'rounded-full border-2 px-4 py-1.5 text-sm font-semibold',
              purpose === p ? 'border-desert-green bg-desert-green text-white' : 'border-border-subtle hover:border-desert-green'
            )}
          >
            {t(`models.purpose.${p}`)}
          </button>
        ))}
      </div>
      {purpose === 'images' && <p className="text-sm text-text-muted mt-2">{t('models.guide.imagesNote')}</p>}

      <ul className="mt-4 divide-y divide-border-subtle rounded-md border border-border-subtle">
        {(data?.items ?? []).map((m) => {
          const installed = data?.installed[m.name] !== undefined
          const dl = downloads.find((d) => d.model === m.name)
          const downloading = !installed && dl && dl.percent >= 0 && dl.percent < 100
          const waiting = !installed && !downloading && starting.has(m.name)
          return (
            <li key={m.name} className={classNames('p-3 sm:p-4', m.recommended && 'bg-surface-secondary')}>
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-semibold">{m.label}</span>
                    <span className="text-xs font-mono text-text-muted">{m.name}</span>
                    <span className="text-xs text-text-muted">{formatBytes(m.bytes)}</span>
                    {m.recommended && (
                      <span className="rounded-full bg-desert-green px-2.5 py-0.5 text-xs font-semibold text-white">
                        {t('easySetup.ai.recommended')}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-secondary mt-1">{m.description}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <span className={classNames('rounded-full px-2 py-0.5 text-xs font-semibold', FIT_STYLE[m.fit])}>
                      {t(`models.fit.${m.fit}`)}
                    </span>
                    <RussianLanguageBadge ru={m.ru} />
                  </div>
                </div>
                <div className="shrink-0">
                  {downloading ? (
                    <div className="w-44" aria-live="polite">
                      <div className="h-2 w-full overflow-hidden rounded bg-surface-secondary">
                        <div className="h-full bg-desert-green transition-all" style={{ width: `${Math.round(dl!.percent)}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-text-secondary">{t('models.downloadingPct', { pct: Math.round(dl!.percent) })}</p>
                    </div>
                  ) : waiting ? (
                    <span className="text-sm text-text-secondary">{t('models.downloadPreparing')}</span>
                  ) : installed ? (
                    <StyledButton variant="primary" icon="IconRobot" onClick={() => router.visit('/chat')}>
                      {t('models.goToChat')}
                    </StyledButton>
                  ) : (
                    <StyledButton
                      variant="primary"
                      icon="IconDownload"
                      disabled={m.fit === 'too-big'}
                      onClick={() => install(m.name)}
                    >
                      {t('common.install')}
                    </StyledButton>
                  )}
                </div>
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-sm text-text-muted mt-3">{t('models.guide.more')}</p>
    </section>
  )
}
