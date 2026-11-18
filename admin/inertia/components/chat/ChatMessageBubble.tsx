import { Children, Fragment, type ReactNode } from 'react'
import classNames from '~/lib/classNames'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChatMessage } from '../../../types/chat'
import { t } from '../../../constants/i18n'
import AnswerExport from './AnswerExport'
import { splitQuotes } from '../../lib/quote'

export interface ChatMessageBubbleProps {
  message: ChatMessage
  // Offered on the latest answer when it was cut off at the length limit.
  onContinue?: () => void
}

/**
 * «Кладезъ»: модели переносят строку внутри ячейки таблицы тегом «<br>» — в таблице Markdown
 * по-другому нельзя. Без этого он показывался как текст «<br>»; здесь становится переносом.
 */
function withBreaks(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child !== 'string' || !/<br\s*\/?>/i.test(child)) return child
    const parts = child.split(/<br\s*\/?>/i)
    return parts.map((part, i) => (
      <Fragment key={i}>
        {i > 0 && <br />}
        {part}
      </Fragment>
    ))
  })
}

/** Размышление — тем же текстом, что ответ, только приглушённым цветом. */
const thinkingComponents = {
  p: ({ children }: any) => <p className="mb-2 last:mb-0">{withBreaks(children)}</p>,
  ul: ({ children }: any) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
  ol: ({ children }: any) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
  li: ({ children }: any) => <li className="mb-1">{withBreaks(children)}</li>,
  h1: ({ children }: any) => <p className="mb-1 font-semibold">{children}</p>,
  h2: ({ children }: any) => <p className="mb-1 font-semibold">{children}</p>,
  h3: ({ children }: any) => <p className="mb-1 font-semibold">{children}</p>,
}

export default function ChatMessageBubble({ message, onContinue }: ChatMessageBubbleProps) {
  return (
    <div
      className={classNames(
        'max-w-[70%] rounded-lg px-4 py-3',
        message.role === 'user' ? 'bg-desert-green text-white' : 'bg-surface-secondary text-text-primary'
      )}
    >
      {message.images && message.images.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {message.images.map((image) => (
            <img
              key={image.id}
              src={image.previewUrl}
              alt={image.name}
              className="max-h-64 w-full rounded-md bg-surface-primary/20 object-contain"
            />
          ))}
        </div>
      )}
      {/* «Кладезъ»: размышление — обычным текстом прямо в ответе, приглушённым цветом, без
          жёлтого окошка с прокруткой. Заголовок «Размышление» можно нажать — свернуть. */}
      {message.thinking && (
        <details open className="mb-3">
          <summary className="cursor-pointer select-none text-xs font-medium text-text-muted hover:text-text-primary">
            {message.isThinking ? (
              <span className="inline-flex items-center gap-1.5">
                {t('chat.reasoning')}
                <span className="h-1.5 w-1.5 rounded-full bg-text-muted animate-pulse inline-block" />
              </span>
            ) : message.thinkingDuration !== undefined ? (
              t('chat.thoughtFor', { s: message.thinkingDuration })
            ) : (
              t('chat.reasoning')
            )}
          </summary>
          <div className="mt-1 break-words border-l-2 border-border-default pl-3 text-sm italic text-text-muted">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={thinkingComponents}>
              {message.thinking}
            </ReactMarkdown>
          </div>
        </details>
      )}
      <div
        className={classNames(
          'break-words',
          message.role === 'assistant' ? 'prose prose-sm max-w-none' : 'whitespace-pre-wrap'
        )}
      >
        {message.role === 'assistant' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code: ({ node, className, children, ...props }: any) => {
                const isInline = !className?.includes('language-')
                if (isInline) {
                  return (
                    <code
                      className="bg-gray-800 text-gray-100 px-2 py-0.5 rounded font-mono text-sm"
                      {...props}
                    >
                      {children}
                    </code>
                  )
                }
                return (
                  <code
                    className="block bg-gray-800 text-gray-100 p-3 rounded-lg overflow-x-auto font-mono text-sm my-2"
                    {...props}
                  >
                    {children}
                  </code>
                )
              },
              p: ({ children }) => <p className="mb-2 last:mb-0">{withBreaks(children)}</p>,
              ul: ({ children }) => <ul className="list-disc pl-5 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal pl-5 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{withBreaks(children)}</li>,
              h1: ({ children }) => <h1 className="text-xl font-bold mb-2">{children}</h1>,
              h2: ({ children }) => <h2 className="text-lg font-bold mb-2">{children}</h2>,
              h3: ({ children }) => <h3 className="text-base font-bold mb-2">{children}</h3>,
              // «Кладезъ»: таблица с рамками и прокруткой вбок — без них столбцы сливались в текст.
              table: ({ children }) => (
                <div className="my-2 overflow-x-auto">
                  <table className="min-w-full border-collapse text-sm">{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th className="border border-border-default bg-surface-primary px-2 py-1 text-left font-semibold align-top">
                  {withBreaks(children)}
                </th>
              ),
              td: ({ children }) => (
                <td className="border border-border-default px-2 py-1 align-top">{withBreaks(children)}</td>
              ),
              blockquote: ({ children }) => (
                <blockquote className="border-l-4 border-border-default pl-4 italic my-2">
                  {children}
                </blockquote>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-desert-green underline hover:text-desert-green/80"
                >
                  {children}
                </a>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        ) : (
          // «Кладезъ»: вопрос с цитатой из ответа («Ответить» на выделенное) — цитата врезкой.
          splitQuotes(message.content).map((part, i) =>
            part.quote ? (
              <div key={i} className="mb-2 border-l-2 border-white/60 pl-2 text-sm italic text-white/80 line-clamp-6">
                {part.text}
              </div>
            ) : (
              <div key={i}>{part.text}</div>
            )
          )
        )}
        {message.isStreaming && (
          <span className="inline-block w-2 h-4 ml-1 bg-current animate-pulse" />
        )}
      </div>
      {message.role === 'assistant' && message.truncated && !message.isStreaming && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border-subtle pt-2 text-xs text-text-secondary">
          <span>{t('chat.cutOff')}</span>
          {onContinue && (
            <button
              type="button"
              onClick={onContinue}
              className="rounded border border-border-default px-2 py-0.5 font-medium text-desert-green hover:bg-surface-primary focus:outline-none focus:ring-2 focus:ring-desert-green"
            >
              {t('common.continue')}
            </button>
          )}
        </div>
      )}
      {message.role === 'assistant' && message.sources && message.sources.length > 0 && (
        <div className="mt-3 border-t border-border-subtle pt-2 text-xs text-text-primary">
          <div className="mb-1 font-medium">{t('chat.sources')}</div>
          <ul className="space-y-0.5">
            {message.sources.map((src, idx) => (
              <li key={idx}>
                {src.title}
                {src.date && <span className="text-text-secondary"> ({src.date})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
      {message.role === 'assistant' && !message.isStreaming && message.content.trim().length > 0 && (
        <AnswerExport content={message.content} />
      )}
      <div
        className={classNames(
          'text-xs mt-2',
          message.role === 'user' ? 'text-white/70' : 'text-text-muted'
        )}
      >
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </div>
    </div>
  )
}
