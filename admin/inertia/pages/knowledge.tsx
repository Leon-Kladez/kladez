import { Head } from '@inertiajs/react'
import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { IconBooks } from '@tabler/icons-react'
import AppLayout from '~/layouts/AppLayout'
import Alert from '~/components/Alert'
import BundlePicker from '~/components/BundlePicker'
import CategoryCard from '~/components/CategoryCard'
import TierSelectionModal from '~/components/TierSelectionModal'
import WikipediaSelector from '~/components/WikipediaSelector'
import StyledModal from '~/components/StyledModal'
import ActiveDownloads from '~/components/ActiveDownloads'
import api from '~/lib/api'
import { errorText } from '~/lib/error_text'
import useInternetStatus from '~/hooks/useInternetStatus'
import { useSystemInfo } from '~/hooks/useSystemInfo'
import { getPrimaryDiskInfo } from '~/hooks/useDiskDisplayData'
import { useDevice } from '~/hooks/useDevice'
import { useNotifications } from '~/context/NotificationContext'
import type { BundleWithStatus, CategoryWithStatus, SpecTier } from '../../types/collections'
import { t, formatBytes } from '../../constants/i18n'

// Те же ключи, что у «Быстрой настройки» и «Каталога материалов»: одни и те же данные.
const CURATED_CATEGORIES_KEY = 'curated-categories'
const WIKIPEDIA_STATE_KEY = 'wikipedia-state'
const BUNDLES_KEY = 'kladez-bundles'

/**
 * «Кладезъ»: «Скачать знания» — одно место вместо «Быстрой настройки» и
 * «Каталога материалов»: готовые наборы, Википедия и отдельные книги, с местом на диске.
 */
export default function Knowledge() {
  const queryClient = useQueryClient()
  const { addNotification } = useNotifications()
  const { isOnline } = useInternetStatus()
  const { canChange } = useDevice()
  const { data: systemInfo } = useSystemInfo({ enabled: true })
  const storage = getPrimaryDiskInfo(systemInfo?.disk, systemInfo?.fsSize)
  const freeBytes = storage ? Math.max(0, storage.totalSize - storage.totalUsed) : null
  const disabled = !isOnline || !canChange

  const { data: bundles } = useQuery({ queryKey: [BUNDLES_KEY], queryFn: () => api.listBundles() })
  const { data: categories } = useQuery({
    queryKey: [CURATED_CATEGORIES_KEY],
    queryFn: () => api.listCuratedCategories(),
    refetchOnWindowFocus: false,
  })
  const { data: wikipediaState } = useQuery({
    queryKey: [WIKIPEDIA_STATE_KEY],
    queryFn: () => api.getWikipediaState(),
    refetchOnWindowFocus: false,
  })

  const [pendingBundle, setPendingBundle] = useState<BundleWithStatus | null>(null)
  const [installing, setInstalling] = useState(false)
  const [activeCategory, setActiveCategory] = useState<CategoryWithStatus | null>(null)
  const [selectedWikipedia, setSelectedWikipedia] = useState<string | null>(null)
  const [submittingWikipedia, setSubmittingWikipedia] = useState(false)

  const refreshAll = () => {
    queryClient.invalidateQueries({ queryKey: [BUNDLES_KEY] })
    queryClient.invalidateQueries({ queryKey: [CURATED_CATEGORIES_KEY] })
    queryClient.invalidateQueries({ queryKey: [WIKIPEDIA_STATE_KEY] })
    queryClient.invalidateQueries({ queryKey: ['download-jobs'] })
  }

  async function installBundle(bundle: BundleWithStatus) {
    setInstalling(true)
    const result = await api.installBundle(bundle.id)
    setInstalling(false)
    setPendingBundle(null)
    if (result?.success) {
      addNotification({ type: 'success', message: t('knowledge.started', { name: bundle.name }) })
      refreshAll()
    } else {
      addNotification({ type: 'error', message: errorText(result, t('knowledge.failed')) })
    }
  }

  async function installTier(category: CategoryWithStatus, tier: SpecTier) {
    try {
      await api.downloadCategoryTier(category.slug, tier.slug)
      addNotification({ type: 'success', message: t('explorer.started', { name: `${category.name} — ${tier.name}` }) })
      refreshAll()
    } catch {
      addNotification({ type: 'error', message: t('knowledge.failed') })
    }
  }

  async function submitWikipedia() {
    if (!selectedWikipedia) return
    setSubmittingWikipedia(true)
    const result = await api.selectWikipedia(selectedWikipedia)
    setSubmittingWikipedia(false)
    if (result?.success) {
      addNotification({
        type: 'success',
        message: selectedWikipedia === 'none' ? t('explorer.wikipediaRemoved') : t('explorer.wikipediaStarted'),
      })
      setSelectedWikipedia(null)
      refreshAll()
    } else {
      addNotification({ type: 'error', message: errorText(result, t('explorer.wikipediaFailed')) })
    }
  }

  return (
    <AppLayout>
      <Head title={t('knowledge.title')} />
      <main className="mx-auto max-w-6xl px-4 py-6 pt-20 md:pt-6">
        <h1 className="text-3xl sm:text-4xl font-semibold mb-2">{t('knowledge.title')}</h1>
        <p className="text-text-muted mb-2">{t('knowledge.subtitle')}</p>
        {freeBytes !== null && (
          <p className="text-text-secondary font-medium">{t('knowledge.free', { size: formatBytes(freeBytes) })}</p>
        )}

        {!isOnline && (
          <Alert title={t('knowledge.offline')} type="warning" variant="solid" className="!mt-6" />
        )}

        <div className="mt-6">
          <ActiveDownloads withHeader />
        </div>

        <section className="mt-8">
          <BundlePicker
            bundles={bundles ?? []}
            selectedId={null}
            onSelect={(bundle) => setPendingBundle(bundle)}
            freeBytes={freeBytes}
            disabled={disabled}
          />
        </section>

        {wikipediaState && wikipediaState.options.length > 0 && (
          <section className="mt-8 bg-surface-primary rounded-lg border border-border-subtle p-6">
            <WikipediaSelector
              options={wikipediaState.options}
              currentSelection={wikipediaState.currentSelection}
              selectedOptionId={selectedWikipedia}
              onSelect={(id) => !disabled && setSelectedWikipedia(id)}
              disabled={disabled}
              showSubmitButton
              onSubmit={submitWikipedia}
              isSubmitting={submittingWikipedia}
            />
          </section>
        )}

        <section className="mt-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-surface-primary border border-border-subtle flex items-center justify-center shadow-sm">
              <IconBooks className="w-6 h-6 text-text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-text-primary">{t('knowledge.books')}</h2>
          </div>
          {categories && categories.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.map((category) => (
                <CategoryCard
                  key={category.slug}
                  category={category}
                  selectedTier={null}
                  onClick={(c) => !disabled && setActiveCategory(c)}
                />
              ))}
            </div>
          ) : (
            <p className="text-text-muted">{t('explorer.noCategories')}</p>
          )}
          <TierSelectionModal
            isOpen={activeCategory !== null}
            onClose={() => setActiveCategory(null)}
            category={activeCategory}
            selectedTierSlug={activeCategory?.installedTierSlug}
            onSelectTier={installTier}
          />
        </section>

        <p className="mt-10 text-sm text-text-muted">{t('knowledge.more')}</p>
      </main>

      {pendingBundle && (
        <StyledModal
          title={t('knowledge.confirmTitle', { name: pendingBundle.name })}
          open
          onCancel={() => !installing && setPendingBundle(null)}
          onConfirm={() => installBundle(pendingBundle)}
          confirmText={t('knowledge.confirm')}
          confirmIcon="IconCloudDownload"
          confirmLoading={installing}
        >
          <p className="text-text-secondary">
            {t('knowledge.confirmBody', { size: formatBytes(pendingBundle.size_mb * 1024 * 1024) })}
          </p>
        </StyledModal>
      )}
    </AppLayout>
  )
}
