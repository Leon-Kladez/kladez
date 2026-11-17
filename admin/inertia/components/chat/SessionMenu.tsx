import { useEffect, useRef, useState } from 'react'
import {
  IconDotsVertical,
  IconMail,
  IconMailOpened,
  IconPencil,
  IconPin,
  IconPinnedOff,
  IconTrash,
} from '@tabler/icons-react'
import classNames from '~/lib/classNames'
import { t } from '../../../constants/i18n'
import type { ChatSession } from '../../../types/chat'

type Props = {
  session: ChatSession
  active: boolean
  onPin: (pinned: boolean) => void
  onUnread: (unread: boolean) => void
  onRename: () => void
  onDelete: () => void
}

/**
 * «Кладезъ»: «⋮» у разговора — закрепить, отметить прочитанным/непрочитанным, переименовать,
 * удалить. Видна при наведении и у открытого разговора; на телефоне — всегда.
 */
export default function SessionMenu({ session, active, onPin, onUnread, onRename, onDelete }: Props) {
  const [open, setOpen] = useState(false)
  const boxRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const run = (fn: () => void) => () => {
    setOpen(false)
    fn()
  }

  const item = 'flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-surface-secondary'

  return (
    <div ref={boxRef} className="absolute right-1 top-1.5">
      <button
        type="button"
        aria-label={t('chat.menu.open')}
        aria-haspopup="menu"
        aria-expanded={open}
        title={t('chat.menu.open')}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className={classNames(
          'rounded p-1 transition-opacity focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-desert-green',
          open || active ? 'opacity-100' : 'opacity-100 sm:opacity-0 sm:group-hover:opacity-100',
          active ? 'text-white hover:bg-white/20' : 'text-text-muted hover:bg-surface-primary hover:text-text-primary'
        )}
      >
        <IconDotsVertical size={16} />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full z-30 mt-1 w-60 overflow-hidden rounded-lg border border-border-default bg-surface-primary py-1 text-text-primary shadow-lg"
        >
          <button type="button" role="menuitem" className={item} onClick={run(() => onPin(!session.pinned))}>
            {session.pinned ? <IconPinnedOff size={16} /> : <IconPin size={16} />}
            {session.pinned ? t('chat.menu.unpin') : t('chat.menu.pin')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(() => onUnread(!session.unread))}>
            {session.unread ? <IconMailOpened size={16} /> : <IconMail size={16} />}
            {session.unread ? t('chat.menu.markRead') : t('chat.menu.markUnread')}
          </button>
          <button type="button" role="menuitem" className={item} onClick={run(onRename)}>
            <IconPencil size={16} />
            {t('chat.menu.rename')}
          </button>
          <div className="my-1 border-t border-border-subtle" />
          <button type="button" role="menuitem" className={classNames(item, 'text-desert-red')} onClick={run(onDelete)}>
            <IconTrash size={16} />
            {t('chat.menu.delete')}
          </button>
        </div>
      )}
    </div>
  )
}
