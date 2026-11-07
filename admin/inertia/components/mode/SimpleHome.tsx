import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
  IconBook2,
  IconCloudDownload,
  IconDeviceMobile,
  IconHelp,
  IconMapRoute,
  IconMessageCircle,
  IconPill,
} from '@tabler/icons-react'
import Alert from '~/components/Alert'
import StyledModal from '~/components/StyledModal'
import OpenOnPhone from '~/components/phones/OpenOnPhone'
import { getServiceLink } from '~/lib/navigation'
import { SERVICE_NAMES } from '../../../constants/service_names'
import type { ServiceSlim } from '../../../types/services'
import { t, formatNumber } from '../../../constants/i18n'

export type LibrarySummary = { books: number; articles: number; nearlyEmpty: boolean }

const TILE =
  'relative rounded border-desert-green border-2 bg-desert-green hover:bg-transparent hover:text-text-primary text-white transition-colors shadow-sm h-48 flex flex-col items-center justify-center cursor-pointer text-center px-4 w-full'
const TILE_BIG =
  'relative rounded border-desert-orange border-2 bg-desert-orange hover:bg-transparent hover:text-text-primary text-white transition-colors shadow-sm min-h-48 flex flex-col items-center justify-center cursor-pointer text-center px-4 py-6 w-full'

/** «12 книг · 34 567 статей». */
export function libraryStats(library: LibrarySummary): string {
  const books = t('simple.books', { count: library.books }).replace(String(library.books), formatNumber(library.books))
  if (library.articles <= 0) return books
  const articles = t('simple.articles', { count: library.articles }).replace(
    String(library.articles),
    formatNumber(library.articles)
  )
  return `${books} · ${articles}`
}

function TileBody({
  icon,
  title,
  description,
  extra,
}: {
  icon: React.ReactNode
  title: string
  description: string
  extra?: React.ReactNode
}) {
  return (
    <>
      <div className="flex items-center justify-center mb-2">{icon}</div>
      <h3 className="font-bold text-2xl break-words hyphens-auto max-w-full">{title}</h3>
      <p className="xl:text-lg mt-2">{description}</p>
      {extra}
    </>
  )
}

/**
 * «Кладезъ», обычный режим: главная из простых плиток — что читать и чем
 * пользоваться, без программ, портов, контейнеров и опасных кнопок.
 */
export default function SimpleHome({
  services,
  library,
  drugReferenceInstalled,
  aiAssistantName,
  isComputer,
  canChange,
}: {
  services: ServiceSlim[]
  library: LibrarySummary
  drugReferenceInstalled: boolean
  aiAssistantName: string
  isComputer: boolean
  canChange: boolean
}) {
  const [phoneOpen, setPhoneOpen] = useState(false)
  const kiwix = services.find((s) => s.service_name === SERVICE_NAMES.KIWIX && s.installed)
  const ai = services.find((s) => s.service_name === SERVICE_NAMES.OLLAMA && s.installed)
  const readHref = kiwix && (kiwix.ui_location || kiwix.custom_url)
    ? getServiceLink(kiwix.ui_location || '', kiwix.custom_url)
    : null
  // Пустая библиотека: вместо «Читать» — крупно «Скачать знания» (если отсюда можно что-то менять).
  const showRead = readHref && !(library.nearlyEmpty && canChange)

  return (
    <div className="p-4">
      {library.nearlyEmpty && canChange && (
        <div className="mb-4">
          <Alert
            title={t('simple.empty.title')}
            message={t('simple.empty.message')}
            type="warning"
            variant="solid"
            className="w-full"
            buttonProps={{
              variant: 'primary',
              children: t('simple.empty.button'),
              icon: 'IconCloudDownload',
              onClick: () => router.visit('/knowledge'),
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {showRead ? (
          <a href={readHref!} target="_blank" rel="noopener noreferrer">
            <div className={TILE}>
              <TileBody
                icon={<IconBook2 size={48} />}
                title={t('simple.read.title')}
                description={t('simple.read.description')}
                extra={
                  library.books > 0 ? <p className="text-sm opacity-90 mt-1">{libraryStats(library)}</p> : null
                }
              />
            </div>
          </a>
        ) : null}

        {canChange && (
          <Link href="/knowledge" className={library.nearlyEmpty ? 'sm:col-span-2 lg:col-span-1' : ''}>
            <div className={library.nearlyEmpty ? TILE_BIG : TILE}>
              <TileBody
                icon={<IconCloudDownload size={library.nearlyEmpty ? 64 : 48} />}
                title={t('simple.download.title')}
                description={
                  library.nearlyEmpty ? t('simple.download.emptyDescription') : t('simple.download.description')
                }
              />
            </div>
          </Link>
        )}

        <Link href="/maps">
          <div className={TILE}>
            <TileBody
              icon={<IconMapRoute size={48} />}
              title={t('simple.maps.title')}
              description={t('simple.maps.description')}
            />
          </div>
        </Link>

        {drugReferenceInstalled && (
          <Link href="/drug-reference">
            <div className={TILE}>
              <TileBody
                icon={<IconPill size={48} />}
                title={t('home.tiles.drugReference.title')}
                description={t('home.tiles.drugReference.description')}
              />
            </div>
          </Link>
        )}

        {ai && (
          <Link href="/chat">
            <div className={TILE}>
              <TileBody
                icon={<IconMessageCircle size={48} />}
                title={t('simple.ask.title')}
                description={t('simple.ask.description', { name: aiAssistantName })}
              />
            </div>
          </Link>
        )}

        {isComputer && (
          <button type="button" onClick={() => setPhoneOpen(true)} className="text-left">
            <div className={TILE}>
              <TileBody
                icon={<IconDeviceMobile size={48} />}
                title={t('simple.phone.title')}
                description={t('simple.phone.description')}
              />
            </div>
          </button>
        )}

        <Link href="/docs/home">
          <div className={TILE}>
            <TileBody
              icon={<IconHelp size={48} />}
              title={t('simple.help.title')}
              description={t('simple.help.description')}
            />
          </div>
        </Link>
      </div>

      {isComputer && (
        <StyledModal
          title={t('simple.phone.title')}
          open={phoneOpen}
          onCancel={() => setPhoneOpen(false)}
          onClose={() => setPhoneOpen(false)}
          cancelText={t('simple.phone.close')}
          large
        >
          <OpenOnPhone />
        </StyledModal>
      )}
    </div>
  )
}
