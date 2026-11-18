import { useEffect, useState, type RefObject } from 'react'
import { IconArrowBackUp } from '@tabler/icons-react'
import { t } from '../../../constants/i18n'

type Spot = { text: string; left: number; top: number }

/**
 * «Кладезъ»: выделили кусок ответа помощника — над выделением появляется «Ответить».
 * Нажали — выделенное встаёт цитатой в поле ввода, дальше можно дописать вопрос.
 * Работает и мышью, и пальцем на телефоне.
 */
export default function QuoteReplyButton({
  containerRef,
  onQuote,
}: {
  containerRef: RefObject<HTMLElement | null>
  onQuote: (text: string) => void
}) {
  const [spot, setSpot] = useState<Spot | null>(null)

  useEffect(() => {
    const update = () => {
      const sel = window.getSelection()
      const box = containerRef.current
      if (!sel || sel.isCollapsed || sel.rangeCount === 0 || !box) return setSpot(null)
      const text = sel.toString().trim()
      if (!text) return setSpot(null)
      const range = sel.getRangeAt(0)
      const start = range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement
      // Только внутри ответа помощника, не в своих вопросах и не в поле ввода.
      const bubble = start?.closest('[data-chat-role="assistant"]')
      if (!bubble || !box.contains(bubble)) return setSpot(null)
      const rect = range.getBoundingClientRect()
      if (!rect.width && !rect.height) return setSpot(null)
      setSpot({
        text,
        left: Math.min(Math.max(rect.left + rect.width / 2, 60), window.innerWidth - 60),
        // Над выделением; если вверху места нет — под ним.
        top: rect.top > 56 ? rect.top - 44 : rect.bottom + 8,
      })
    }
    let timer: number | undefined
    const later = () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(update, 120)
    }
    document.addEventListener('selectionchange', later)
    const box = containerRef.current
    box?.addEventListener('scroll', later, { passive: true })
    window.addEventListener('resize', later)
    return () => {
      window.clearTimeout(timer)
      document.removeEventListener('selectionchange', later)
      box?.removeEventListener('scroll', later)
      window.removeEventListener('resize', later)
    }
  }, [containerRef])

  if (!spot) return null
  return (
    <button
      type="button"
      // Не снимать выделение нажатием на саму кнопку.
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        onQuote(spot.text)
        window.getSelection()?.removeAllRanges()
        setSpot(null)
      }}
      style={{ left: spot.left, top: spot.top, transform: 'translateX(-50%)' }}
      className="fixed z-[60] inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white shadow-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-desert-green"
    >
      <IconArrowBackUp size={16} aria-hidden="true" />
      {t('chat.replyToSelection')}
    </button>
  )
}
