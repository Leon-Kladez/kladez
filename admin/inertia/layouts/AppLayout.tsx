import { useState } from 'react'
import Footer from '~/components/Footer'
import ChatButton from '~/components/chat/ChatButton'
import ChatModal from '~/components/chat/ChatModal'
import useServiceInstalledStatus from '~/hooks/useServiceInstalledStatus'
import { SERVICE_NAMES } from '../../constants/service_names'
import { Link, router, usePage } from '@inertiajs/react'
import { hasBrief, type BriefSources } from '~/lib/brief'
import { IconArrowLeft } from '@tabler/icons-react'
import classNames from 'classnames'
import KladezLogo from '~/components/KladezLogo'
import { t } from '../../constants/i18n'
import PhoneReadOnlyBanner from '~/components/phones/PhoneReadOnlyBanner'
import ModeSwitch from '~/components/mode/ModeSwitch'
import BriefButton from '~/components/brief/BriefButton'

export default function AppLayout({
  children,
  compact = false,
}: {
  children: React.ReactNode
  /**
   * Compact header for focused tool pages (e.g. Drug Reference): a small inline
   * logo + title instead of the full-height branding block, so the tool's own
   * controls sit near the top of the viewport instead of ~230px down.
   */
  compact?: boolean
}) {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const { isInstalled: aiAssistantInstalled } = useServiceInstalledStatus(SERVICE_NAMES.OLLAMA)
  // На узком экране кнопка «Бриф» встала бы на «Продвинутый» — опускаем шапку под неё.
  const briefShown = hasBrief(usePage<{ brief?: BriefSources }>().props.brief)

  return (
    <div className="min-h-screen flex flex-col">
      {/* «Кладезъ»: на телефоне — «изменять можно только на компьютере». Над всем остальным,
          чтобы не попасть под «На главную» (у неё absolute-позиция внутри обёртки ниже). */}
      <PhoneReadOnlyBanner />
      <div className="relative flex-1 flex flex-col">
      {/* «Кладезъ»: ролик «Бриф» — справа вверху на всех страницах (если файл ролика есть). */}
      <div className="absolute right-2 top-2 z-20 sm:right-4 sm:top-4">
        <BriefButton />
      </div>
      {
        window.location.pathname !== '/home' && (
          <Link
            href="/home"
            className={classNames(
              'absolute left-4 flex items-center',
              compact ? 'top-4' : 'top-60 md:top-48'
            )}
          >
            <IconArrowLeft className="mr-2" size={24} />
            <p className="text-lg text-text-secondary">{t('nav.backToHome')}</p>
          </Link>
        )}
      <div
        className={classNames(
          'flex cursor-pointer items-center justify-center',
          compact ? 'gap-3 p-3 flex-row' : 'gap-2 p-2 flex-col',
          briefShown && !compact && 'pt-12 sm:pt-2'
        )}
        onClick={() => router.visit('/home')}
      >
        {/* «Кладезъ»: на главной по бокам от логотипа — «Обычный» / «Продвинутый». */}
        {!compact && window.location.pathname === '/home' ? (
          <ModeSwitch
            logo={
              <h1>
                <KladezLogo />
              </h1>
            }
          />
        ) : (
          <h1>
            <KladezLogo compact={compact} />
          </h1>
        )}
      </div>
      <hr className={
        classNames(
          "text-desert-green font-semibold h-[1.5px] bg-desert-green border-none",
          !compact && window.location.pathname !== '/home' ? "mt-12 md:mt-0" : "mt-0"
        )} />
      <div className="flex-1 w-full bg-desert">{children}</div>
      <Footer />
      </div>

      {aiAssistantInstalled && (
        <>
          <ChatButton onClick={() => setIsChatOpen(true)} />
          <ChatModal open={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </>
      )}
    </div>
  )
}
