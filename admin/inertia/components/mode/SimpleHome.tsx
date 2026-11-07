import { useState } from 'react'
import { Link, router } from '@inertiajs/react'
import {
  IconBook2,
  IconDeviceMobile,
  IconHelp,
  IconMapRoute,
  IconMessageCircle,
  IconPill,
} from '@tabler/icons-react'
import Alert from '~/components/Alert'
import StyledModal from '~/components/StyledModal'
import OpenOnPhone from '~/components/phones/OpenOnPhone'
import { SERVICE_NAMES } from '../../../constants/service_names'
import type { ServiceSlim } from '../../../types/services'
import { t, formatNumber } from '../../../constants/i18n'

export type LibrarySummary = { books: number; articles: number; nearlyEmpty: boolean }

const TILE =
  'relative rounded border-desert-green border-2 bg-desert-green hover:bg-transparent hover:text-text-primary text-white transition-colors shadow-sm h-48 flex flex-col items-center justify-center cursor-pointer text-center px-4 w-full'

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
  const ai = services.find((s) => s.service_name === SERVICE_NAMES.OLLAMA && s.installed)

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
              onClick: () => router.visit('/library#add'),
            }}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* «Библиотека» — одно место: мои книги (Читать) и «Добавить книги». */}
        <Link href={library.nearlyEmpty && canChange ? '/library#add' : '/library'}>
          <div className={TILE}>
            <TileBody
              icon={<IconBook2 size={48} />}
              title={t('simple.library.title')}
              description={t('simple.library.description')}
              extra={library.books > 0 ? <p className="text-sm opacity-90 mt-1">{libraryStats(library)}</p> : null}
            />
          </div>
        </Link>

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
