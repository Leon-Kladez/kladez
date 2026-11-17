import classNames from '~/lib/classNames'
import StyledButton from '../StyledButton'
import { router, usePage } from '@inertiajs/react'
import { ChatSession } from '../../../types/chat'
import { IconMessage, IconPinFilled } from '@tabler/icons-react'
import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import api from '~/lib/api'
import { useModals } from '~/context/ModalContext'
import StyledModal from '../StyledModal'
import SessionMenu from './SessionMenu'
import KnowledgeBaseModal from './KnowledgeBaseModal'
import NomadMdModal from './NomadMdModal'
import KladezLogo from '../KladezLogo'
import { t } from '../../../constants/i18n'

interface ChatSidebarProps {
  sessions: ChatSession[]
  activeSessionId: string | null
  onSessionSelect: (id: string) => void
  onNewChat: () => void
  onClearHistory: () => void
  /** Разговор удалён из меню «⋮» (если он был открыт — начать новый). */
  onSessionDeleted?: (id: string) => void
  isInModal?: boolean
  isMobileOpen?: boolean
  onMobileClose?: () => void
}

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSessionSelect,
  onNewChat,
  onClearHistory,
  onSessionDeleted,
  isInModal = false,
  isMobileOpen = false,
  onMobileClose,
}: ChatSidebarProps) {
  const { aiAssistantName } = usePage<{ aiAssistantName: string }>().props
  const [isKnowledgeBaseModalOpen, setIsKnowledgeBaseModalOpen] = useState(
    () => new URLSearchParams(window.location.search).get('knowledge_base') === 'true'
  )
  const [isNomadMdModalOpen, setIsNomadMdModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { openModal, closeAllModals } = useModals()
  // «Кладезъ»: переименование прямо в списке — Enter сохраняет, Esc отменяет.
  const [renaming, setRenaming] = useState<{ id: string; text: string } | null>(null)

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['chatSessions'] })
  const mark = async (id: string, data: { pinned?: boolean; unread?: boolean; title?: string }) => {
    await api.updateChatSession(id, data)
    refresh()
  }
  const saveRename = async () => {
    if (!renaming) return
    const title = renaming.text.trim()
    setRenaming(null)
    if (title) await mark(renaming.id, { title: title.slice(0, 200) })
  }
  const askDelete = (session: ChatSession) => {
    openModal(
      <StyledModal
        title={t('chat.menu.deleteTitle')}
        onConfirm={async () => {
          closeAllModals()
          await api.deleteChatSession(session.id)
          refresh()
          onSessionDeleted?.(session.id)
        }}
        onCancel={closeAllModals}
        open={true}
        confirmText={t('chat.menu.delete')}
        cancelText={t('common.cancel')}
        confirmVariant="danger"
      >
        <p className="text-text-primary">{t('chat.menu.deleteQuestion', { title: session.title })}</p>
      </StyledModal>,
      'confirm-delete-chat-modal'
    )
  }

  function handleCloseKnowledgeBase() {
    setIsKnowledgeBaseModalOpen(false)
    const params = new URLSearchParams(window.location.search)
    if (params.has('knowledge_base')) {
      params.delete('knowledge_base')
      const newUrl = [window.location.pathname, params.toString()].filter(Boolean).join('?')
      window.history.replaceState(window.history.state, '', newUrl)
    }
  }

  return (
    <aside
      id="chat-sidebar"
      className={classNames(
        'w-64 bg-surface-secondary border-r border-border-subtle flex-col h-full shrink-0',
        'fixed inset-y-0 left-0 z-50 md:static md:z-auto md:flex',
        isMobileOpen ? 'flex' : 'hidden'
      )}
      aria-label={t('chat.conversations')}
    >
      <div className="p-4 border-b border-border-subtle h-[75px] flex items-center justify-center">
        <StyledButton
          onClick={() => {
            onNewChat()
            onMobileClose?.()
          }}
          icon="IconPlus"
          variant="primary"
          fullWidth
        >
          {t('chat.newChat')}
        </StyledButton>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <div className="p-4 text-center text-text-muted text-sm">{t('chat.noPrevious')}</div>
        ) : (
          <div className="p-2 space-y-1">
            {sessions.map((session) => (
              <div key={session.id} className="group relative">
              {renaming?.id === session.id ? (
                <input
                  autoFocus
                  value={renaming.text}
                  aria-label={t('chat.menu.rename')}
                  onChange={(e) => setRenaming({ id: session.id, text: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename()
                    else if (e.key === 'Escape') setRenaming(null)
                  }}
                  onBlur={saveRename}
                  className="w-full rounded-lg border border-desert-green bg-surface-primary px-3 py-2 text-sm text-text-primary focus:outline-none"
                />
              ) : (
              <button
                onClick={() => {
                  onSessionSelect(session.id)
                  // Открыли — значит прочитано.
                  if (session.unread) mark(session.id, { unread: false })
                  onMobileClose?.()
                }}
                className={classNames(
                  'w-full text-left pl-3 pr-9 py-2 rounded-lg transition-colors',
                  activeSessionId === session.id
                    ? 'bg-desert-green text-white'
                    : 'hover:bg-surface-secondary text-text-primary'
                )}
              >
                <div className="flex items-start gap-2">
                  <IconMessage
                    className={classNames(
                      'h-5 w-5 mt-0.5 shrink-0',
                      activeSessionId === session.id ? 'text-white' : 'text-text-muted'
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <div className={classNames('text-sm truncate flex items-center gap-1', session.unread ? 'font-bold' : 'font-medium')}>
                      {session.pinned && <IconPinFilled size={12} className="shrink-0 opacity-70" aria-label={t('chat.menu.pinned')} />}
                      {session.unread && <span className="h-2 w-2 shrink-0 rounded-full bg-desert-orange" aria-label={t('chat.menu.unreadMark')} />}
                      <span className="truncate">{session.title}</span>
                    </div>
                    {session.lastMessage && (
                      <div
                        className={classNames(
                          'text-xs truncate mt-0.5',
                          activeSessionId === session.id ? 'text-white/80' : 'text-text-muted'
                        )}
                      >
                        {session.lastMessage}
                      </div>
                    )}
                  </div>
                </div>
              </button>
              )}
              {renaming?.id !== session.id && (
                <SessionMenu
                  session={session}
                  active={activeSessionId === session.id}
                  onPin={(pinned) => mark(session.id, { pinned })}
                  onUnread={(unread) => mark(session.id, { unread })}
                  onRename={() => setRenaming({ id: session.id, text: session.title })}
                  onDelete={() => askDelete(session)}
                />
              )}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="p-4 flex flex-col items-center justify-center gap-y-2">
        <KladezLogo height={70} className="mb-6" />
        <StyledButton
          onClick={() => {
            // /chat is served by the admin app itself, so navigate in place rather than
            // spawning a window. Popping out broke anyone running NOMAD as an installed
            // web app or in kiosk mode, who then had a stray window to get back out of.
            router.visit(isInModal ? '/chat' : '/home')
          }}
          icon={isInModal ? 'IconArrowRight' : 'IconHome'}
          variant="outline"
          size="sm"
          fullWidth
        >
          {isInModal ? t('chat.openFull') : t('nav.backToHome')}
        </StyledButton>
        <StyledButton
          onClick={() => {
            router.visit('/settings/models')
          }}
          icon="IconDatabase"
          variant="primary"
          size="sm"
          fullWidth
        >
          {t('chat.modelsSettings')}
        </StyledButton>
        <StyledButton
          onClick={() => {
            setIsKnowledgeBaseModalOpen(true)
          }}
          icon="IconBrain"
          variant="primary"
          size="sm"
          fullWidth
        >
          {t('chat.knowledgeBase')}
        </StyledButton>
        <StyledButton
          onClick={() => {
            setIsNomadMdModalOpen(true)
          }}
          icon="IconFileDescription"
          variant="primary"
          size="sm"
          fullWidth
        >
          {t('nomadMd.title')}
        </StyledButton>
        {sessions.length > 0 && (
          <StyledButton
            onClick={onClearHistory}
            icon="IconTrash"
            variant="danger"
            size="sm"
            fullWidth
          >
            {t('chat.clearHistory')}
          </StyledButton>
        )}
      </div>
      {isKnowledgeBaseModalOpen && (
        <KnowledgeBaseModal aiAssistantName={aiAssistantName} onClose={handleCloseKnowledgeBase} />
      )}
      {isNomadMdModalOpen && (
        <NomadMdModal
          aiAssistantName={aiAssistantName}
          onClose={() => setIsNomadMdModalOpen(false)}
        />
      )}
    </aside>
  )
}
