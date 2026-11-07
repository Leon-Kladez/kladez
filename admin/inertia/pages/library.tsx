import { Head, usePage } from '@inertiajs/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import classNames from 'classnames'
import {
  IconBook2,
  IconChevronDown,
  IconCircleCheck,
  IconCloudDownload,
  IconExternalLink,
  IconSearch,
} from '@tabler/icons-react'
import AppLayout from '~/layouts/AppLayout'
import Alert from '~/components/Alert'
import BundlePicker from '~/components/BundlePicker'
import StyledModal from '~/components/StyledModal'
import StyledButton from '~/components/StyledButton'
import api from '~/lib/api'
import { errorText } from '~/lib/error_text'
import { getServiceLink } from '~/lib/navigation'
import useDownloads from '~/hooks/useDownloads'
import useInternetStatus from '~/hooks/useInternetStatus'
import { useSystemInfo } from '~/hooks/useSystemInfo'
import { getPrimaryDiskInfo } from '~/hooks/useDiskDisplayData'
import { useDevice } from '~/hooks/useDevice'
import { useNotifications } from '~/context/NotificationContext'
import {
  buildTopics,
  etaMinutes,
  etaSeconds,
  rowState,
  type BookRow,
  type RowState,
} from '~/lib/library_rows'
import { SERVICE_NAMES } from '../../constants/service_names'
import type { BundleWithStatus } from '../../types/collections'
import type { DownloadJobWithProgress } from '../../types/downloads'
import type { ServiceSlim } from '../../types/services'
import { t, formatBytes, formatNumber } from '../../constants/i18n'

// Те же ключи, что у «Быстрой настройки» и «Каталога материалов»: одни и те же данные.
const CURATED_CATEGORIES_KEY = 'curated-categories'
const WIKIPEDIA_STATE_KEY = 'wikipedia-state'
const BUNDLES_KEY = 'kladez-bundles'
const BOOKS_KEY = 'library-books'

/** Скорость скачивания по двум последним замерам, байт/с (для «осталось ~N мин»). */
function useDownloadSpeeds(jobs: DownloadJobWithProgress[]): Map<string, number> {
  const samples = useRef(new Map<string, { bytes: number; at: number; speed: number }>())
  return useMemo(() => {
    const now = Date.now()
    const speeds = new Map<string, number>()
    for (const job of jobs) {
      if (job.downloadedBytes === undefined) continue
      const prev = samples.current.get(job.jobId)
      let speed = prev?.speed ?? 0
      if (prev && now > prev.at && job.downloadedBytes > prev.bytes) {
        const instant = (job.downloadedBytes - prev.bytes) / ((now - prev.at) / 1000)
        speed = speed > 0 ? speed * 0.7 + instant * 0.3 : instant
      }
      samples.current.set(job.jobId, { bytes: job.downloadedBytes, at: now, speed })
      speeds.set(job.jobId, speed)
    }
    return speeds
  }, [jobs])
}

function RowStatus({ state, speed }: { state: RowState; speed: number }) {
  if (state.state !== 'downloading') return null
  const seconds = state.job ? etaSeconds(state.job, speed) : null
  const waiting = state.job?.status === 'waiting' || state.job?.status === 'delayed'
  return (
    <div className="mt-2 w-full">
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-secondary" aria-hidden="true">
        <div className="h-full bg-desert-green transition-all" style={{ width: `${state.percent}%` }} />
      </div>
      <p className="mt-1 text-sm text-text-secondary" role="status">
        {waiting ? t('libraryPage.waiting') : t('libraryPage.downloading', { percent: state.percent })}
        {!waiting && seconds !== null && (
          <>
            {' · '}
            {etaMinutes(seconds) === 0 ? t('libraryPage.etaSoon') : t('libraryPage.eta', { count: etaMinutes(seconds) })}
          </>
        )}
      </p>
    </div>
  )
}

/**
 * «Кладезъ»: «Библиотека» — одно место для книг. Сверху «Мои книги» (кнопка
 * «Читать» у каждой, поиск по всем), ниже «Добавить книги»: готовые наборы и
 * список по темам; «Скачать» — полоса с % в той же строке, а скачанная книга
 * сама появляется в «Моих книгах».
 */
export default function Library() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotifications()
  const { isOnline } = useInternetStatus()
  const { canChange } = useDevice()
  const { system } = usePage<{ system?: { services: ServiceSlim[] } }>().props
  const { data: systemInfo } = useSystemInfo({ enabled: canChange })
  const storage = getPrimaryDiskInfo(systemInfo?.disk, systemInfo?.fsSize)
  const freeBytes = storage ? Math.max(0, storage.totalSize - storage.totalUsed) : null
  const disabled = !isOnline || !canChange

  const kiwix = (system?.services ?? []).find(
    (s) => s.service_name === SERVICE_NAMES.KIWIX && s.installed
  )
  const kiwixBase =
    kiwix && (kiwix.ui_location || kiwix.custom_url)
      ? getServiceLink(kiwix.ui_location || '', kiwix.custom_url).replace(/\/+$/, '')
      : null

  const { data: books, isLoading: loadingBooks } = useQuery({
    queryKey: [BOOKS_KEY],
    queryFn: () => api.listLibraryBooks(),
  })
  const { data: bundles } = useQuery({ queryKey: [BUNDLES_KEY], queryFn: () => api.listBundles(), enabled: canChange })
  const { data: categories } = useQuery({
    queryKey: [CURATED_CATEGORIES_KEY],
    queryFn: () => api.listCuratedCategories(),
    refetchOnWindowFocus: false,
    enabled: canChange,
  })
  const { data: wikipediaState } = useQuery({
    queryKey: [WIKIPEDIA_STATE_KEY],
    queryFn: () => api.getWikipediaState(),
    enabled: canChange,
  })
  const { data: jobs } = useDownloads({ filetype: 'zim', enabled: canChange })
  const activeJobs = jobs ?? []
  const speeds = useDownloadSpeeds(activeJobs)

  // Скачивание закончилось — книга уже в library.xml: обновляем «Мои книги» и состояние строк.
  const prevJobCount = useRef(0)
  useEffect(() => {
    if (activeJobs.length < prevJobCount.current) {
      queryClient.invalidateQueries({ queryKey: [BOOKS_KEY] })
      queryClient.invalidateQueries({ queryKey: [WIKIPEDIA_STATE_KEY] })
      queryClient.invalidateQueries({ queryKey: [BUNDLES_KEY] })
    }
    prevJobCount.current = activeJobs.length
  }, [activeJobs.length, queryClient])

  const topics = useMemo(
    () =>
      buildTopics(categories ?? [], wikipediaState?.options ?? [], {
        name: t('libraryPage.topicWikipedia'),
        description: t('libraryPage.topicWikipediaText'),
      }),
    [categories, wikipediaState]
  )
  const installedFiles = useMemo(() => (books ?? []).map((b) => b.file), [books])
  const [openTopic, setOpenTopic] = useState<string | null>(null)
  const [starting, setStarting] = useState<string | null>(null)
  const [pendingBundle, setPendingBundle] = useState<BundleWithStatus | null>(null)
  const [installingBundle, setInstallingBundle] = useState(false)
  const [query, setQuery] = useState('')

  // Ссылка «Добавить книги» с главной ведёт сюда с #add.
  useEffect(() => {
    if (window.location.hash === '#add') document.getElementById('add')?.scrollIntoView()
  }, [])

  const refreshDownloads = () => {
    queryClient.invalidateQueries({ queryKey: ['download-jobs'] })
    queryClient.invalidateQueries({ queryKey: [WIKIPEDIA_STATE_KEY] })
  }

  async function download(row: BookRow) {
    if (!row.url) return
    setStarting(row.key)
    try {
      const result =
        row.kind === 'wikipedia'
          ? await api.selectWikipedia(row.id)
          : await api.downloadRemoteZimFile(row.url, {
              title: row.title,
              summary: row.description || undefined,
              size_bytes: row.sizeBytes || undefined,
            })
      // Ошибку сети уже показал catchInternal — второе сообщение не нужно.
      if (!result) return
      if ('success' in result && result.success === false) throw result
      addNotification({ type: 'success', message: t('libraryPage.started', { name: row.title }) })
      refreshDownloads()
    } catch (error) {
      addNotification({ type: 'error', message: errorText(error, t('libraryPage.failed')) })
    } finally {
      setStarting(null)
    }
  }

  async function installBundle(bundle: BundleWithStatus) {
    setInstallingBundle(true)
    const result = await api.installBundle(bundle.id)
    setInstallingBundle(false)
    setPendingBundle(null)
    if (result?.success) {
      addNotification({ type: 'success', message: t('libraryPage.started', { name: bundle.name }) })
      refreshDownloads()
      queryClient.invalidateQueries({ queryKey: [BUNDLES_KEY] })
    } else {
      addNotification({ type: 'error', message: errorText(result, t('libraryPage.failed')) })
    }
  }

  function search(e: React.FormEvent) {
    e.preventDefault()
    if (!kiwixBase || !query.trim()) return
    window.open(`${kiwixBase}/search?pattern=${encodeURIComponent(query.trim())}`, '_blank', 'noopener')
  }

  return (
    <AppLayout>
      <Head title={t('libraryPage.title')} />
      <main className="mx-auto max-w-5xl px-4 py-6 pt-20 md:pt-6">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-2">{t('libraryPage.title')}</h1>
        <p className="text-text-muted mb-6">{t('libraryPage.subtitle')}</p>

        {/* ── Мои книги ───────────────────────────────────────────── */}
        <section aria-labelledby="mine" className="mb-10">
          <h2 id="mine" className="flex items-center gap-2 text-2xl font-semibold mb-4">
            <IconBook2 className="size-7" aria-hidden="true" />
            {t('libraryPage.mine')}
          </h2>

          {kiwixBase ? (
            <form onSubmit={search} className="mb-4 flex gap-2">
              <label className="relative flex-1">
                <span className="sr-only">{t('libraryPage.searchPlaceholder')}</span>
                <IconSearch className="absolute left-3 top-1/2 size-5 -translate-y-1/2 text-text-muted" aria-hidden="true" />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('libraryPage.searchPlaceholder')}
                  className="w-full rounded-lg border-2 border-border-default bg-surface-primary py-2.5 pl-10 pr-3 text-lg focus:border-desert-green focus:outline-none"
                />
              </label>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-desert-green px-4 py-2 font-semibold text-white hover:brightness-110"
              >
                <IconSearch className="size-5" aria-hidden="true" />
                {t('libraryPage.search')}
              </button>
            </form>
          ) : (
            <Alert title={t('libraryPage.noReader')} type="info" variant="bordered" className="!mb-4" />
          )}

          {!loadingBooks && (books ?? []).length === 0 && <p className="text-text-muted">{t('libraryPage.noBooks')}</p>}
          <ul className="divide-y divide-border-subtle rounded-lg border-2 border-border-subtle bg-surface-primary">
            {(books ?? []).map((book) => (
              <li key={book.file} className="flex flex-col sm:flex-row sm:items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-semibold text-text-primary">{book.title}</p>
                  <p className="text-sm text-text-muted">
                    {[
                      book.articles > 0 ? t('simple.articles', { count: book.articles }).replace(String(book.articles), formatNumber(book.articles)) : null,
                      book.sizeBytes ? formatBytes(book.sizeBytes) : null,
                      book.starter ? t('libraryPage.starterNote') : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                {kiwixBase && (
                  <a
                    href={`${kiwixBase}/content/${encodeURIComponent(book.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-desert-green px-5 py-2 font-semibold text-white hover:brightness-110"
                  >
                    {t('libraryPage.read')}
                    <IconExternalLink size={16} aria-hidden="true" />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </section>

        {/* ── Добавить книги ──────────────────────────────────────── */}
        {canChange && (
          <section id="add" aria-labelledby="add-title" className="scroll-mt-4">
            <h2 id="add-title" className="flex items-center gap-2 text-2xl font-semibold mb-2">
              <IconCloudDownload className="size-7" aria-hidden="true" />
              {t('libraryPage.add')}
            </h2>
            <p className="text-text-muted mb-1">{t('libraryPage.addSubtitle')}</p>
            {freeBytes !== null && (
              <p className="text-text-secondary font-medium mb-4">{t('libraryPage.free', { size: formatBytes(freeBytes) })}</p>
            )}
            {!isOnline && <Alert title={t('libraryPage.offline')} type="warning" variant="solid" className="!mb-6" />}

            {(bundles ?? []).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3">{t('libraryPage.quick')}</h3>
                <BundlePicker
                  bundles={bundles ?? []}
                  selectedId={null}
                  onSelect={(bundle) => setPendingBundle(bundle)}
                  freeBytes={freeBytes}
                  disabled={disabled}
                />
              </div>
            )}

            <div className="space-y-3">
              {topics.map((topic) => {
                const open = openTopic === topic.slug
                return (
                  <div key={topic.slug} className="rounded-lg border-2 border-border-subtle bg-surface-primary">
                    <button
                      type="button"
                      aria-expanded={open}
                      onClick={() => setOpenTopic(open ? null : topic.slug)}
                      className="flex w-full items-center justify-between gap-3 p-4 text-left"
                    >
                      <span>
                        <span className="block text-xl font-semibold text-text-primary">{topic.name}</span>
                        <span className="block text-sm text-text-muted">{topic.description}</span>
                      </span>
                      <IconChevronDown
                        className={classNames('size-6 shrink-0 transition-transform', open && 'rotate-180')}
                        aria-hidden="true"
                      />
                    </button>
                    {open && (
                      <ul className="divide-y divide-border-subtle border-t border-border-subtle">
                        {topic.rows.map((row) => {
                          const state = rowState(row, installedFiles, activeJobs, wikipediaState?.currentSelection ?? null)
                          const speed = state.state === 'downloading' && state.job ? speeds.get(state.job.jobId) ?? 0 : 0
                          const tooBig = freeBytes !== null && row.sizeBytes > freeBytes
                          return (
                            <li key={row.key} className="p-4">
                              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                <div className="min-w-0 flex-1">
                                  <p className="font-semibold text-text-primary">{row.title}</p>
                                  {row.description && <p className="text-sm text-text-muted">{row.description}</p>}
                                  {row.kind === 'wikipedia' && state.state === 'available' && wikipediaState?.currentSelection?.optionId && wikipediaState.currentSelection.optionId !== 'none' && (
                                    <p className="text-xs text-text-muted mt-1">{t('libraryPage.replacesWikipedia')}</p>
                                  )}
                                  {state.state === 'failed' && (
                                    <p className="text-sm text-desert-red mt-1">{t('libraryPage.failedRow')}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-3 shrink-0">
                                  <span className="text-sm text-text-secondary whitespace-nowrap">{formatBytes(row.sizeBytes)}</span>
                                  {state.state === 'installed' ? (
                                    <span className="inline-flex items-center gap-1 text-desert-green font-semibold">
                                      <IconCircleCheck className="size-5" aria-hidden="true" />
                                      {t('libraryPage.have')}
                                    </span>
                                  ) : state.state === 'downloading' ? null : (
                                    <StyledButton
                                      variant="primary"
                                      icon="IconCloudDownload"
                                      disabled={disabled || tooBig || starting !== null}
                                      loading={starting === row.key}
                                      onClick={() => download(row)}
                                    >
                                      {tooBig ? t('libraryPage.noSpace') : t('libraryPage.download')}
                                    </StyledButton>
                                  )}
                                </div>
                              </div>
                              <RowStatus state={state} speed={speed} />
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>

            <p className="mt-8 text-sm text-text-muted">{t('libraryPage.more')}</p>
          </section>
        )}
      </main>

      {pendingBundle && (
        <StyledModal
          title={t('libraryPage.confirmTitle', { name: pendingBundle.name })}
          open
          onCancel={() => !installingBundle && setPendingBundle(null)}
          onConfirm={() => installBundle(pendingBundle)}
          confirmText={t('libraryPage.download')}
          confirmIcon="IconCloudDownload"
          confirmLoading={installingBundle}
        >
          <p className="text-text-secondary">
            {t('libraryPage.confirmBody', { size: formatBytes(pendingBundle.size_mb * 1024 * 1024) })}
          </p>
        </StyledModal>
      )}
    </AppLayout>
  )
}
