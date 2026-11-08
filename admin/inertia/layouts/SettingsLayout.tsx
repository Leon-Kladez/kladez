import BriefButton from '~/components/brief/BriefButton'
import {
  IconAdjustments,
  IconArrowBigUpLines,
  IconBox,
  IconChartBar,
  IconDeviceMobile,
  IconCode,
  IconFolder,
  IconGavel,
  IconHeart,
  IconMapRoute,
  IconMovie,
  IconSettings,
  IconWand,
  IconZoom
} from '@tabler/icons-react'
import { usePage } from '@inertiajs/react'
import StyledSidebar from '~/components/StyledSidebar'
import useServiceInstalledStatus from '~/hooks/useServiceInstalledStatus'
import useCreatorPacks from '~/hooks/useCreatorPacks'
import { SERVICE_NAMES } from '../../constants/service_names'
import { t } from '../../constants/i18n'
import PhoneReadOnlyBanner from '~/components/phones/PhoneReadOnlyBanner'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const { aiAssistantName } = usePage<{ aiAssistantName: string }>().props
  const aiAssistantInstallStatus = useServiceInstalledStatus(SERVICE_NAMES.OLLAMA)
  // Only show the Creator Packs entry on builds that can actually install packs
  // (release-injected key present) — a fork built from source has no key.
  const { configured: creatorPacksConfigured } = useCreatorPacks()

  const navigation = [
    ...(aiAssistantInstallStatus.isInstalled ? [{ name: aiAssistantName, href: '/settings/models', icon: IconWand, current: false }] : []),
    { name: t('nav.settings.supplyDepot'), href: '/supply-depot', icon: IconBox, current: false },
    { name: t('nav.settings.benchmark'), href: '/settings/benchmark', icon: IconChartBar, current: false },
    { name: t('nav.settings.contentExplorer'), href: '/settings/zim/remote-explorer', icon: IconZoom, current: false },
    { name: t('nav.settings.contentManager'), href: '/settings/zim', icon: IconFolder, current: false },
    ...(creatorPacksConfigured ? [{ name: t('nav.settings.creatorPacks'), href: '/settings/creator-packs', icon: IconMovie, current: false }] : []),
    { name: t('nav.settings.mapsManager'), href: '/settings/maps', icon: IconMapRoute, current: false },
    // «Кладезъ»: «Журналы и показатели» (Dozzle, порт 9999) убраны — порт не открыт,
    // ссылка вела в никуда. Журналы для помощи — «Сведения для поддержки» внизу меню.
    {
      name: t('nav.settings.checkUpdates'),
      href: '/settings/update',
      icon: IconArrowBigUpLines,
      current: false,
    },
    { name: t('nav.settings.system'), href: '/settings/system', icon: IconSettings, current: false },
    { name: t('phones.nav'), href: '/settings/phones', icon: IconDeviceMobile, current: false },
    { name: t('nav.settings.advanced'), href: '/settings/advanced', icon: IconAdjustments, current: false },
    { name: t('nav.settings.apiReference'), href: '/reference', icon: IconCode, current: false },
    { name: t('nav.settings.support'), href: '/settings/support', icon: IconHeart, current: false },
    { name: t('nav.settings.legal'), href: '/settings/legal', icon: IconGavel, current: false },
  ]

  return (
    <div className="min-h-screen bg-surface-secondary/90">
      {/* «Кладезъ»: ролик «Бриф» — справа вверху (если файл ролика есть). */}
      <div className="fixed right-2 top-2 z-30 sm:right-4 sm:top-4">
        <BriefButton />
      </div>
      <div className="xl:pl-72">
        {/* Слева на телефоне — кнопка меню настроек. */}
        <PhoneReadOnlyBanner className="pl-16 xl:pl-4" />
      </div>
      <div className="flex flex-row">
        <StyledSidebar title={t('nav.settings.title')} items={navigation} />
        {children}
      </div>
    </div>
  )
}
