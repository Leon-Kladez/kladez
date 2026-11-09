import React from 'react'
import Markdoc from '@markdoc/markdoc'
import { Heading } from './markdoc/Heading'
import { List } from './markdoc/List'
import { ListItem } from './markdoc/ListItem'
import { Image } from './markdoc/Image'
import { Table, TableHead, TableBody, TableRow, TableHeader, TableCell } from './markdoc/Table'

// Paragraph component
const Paragraph = ({ children }: { children: React.ReactNode }) => {
  return <p className="mb-4 leading-relaxed text-desert-green-darker/85">{children}</p>
}

// Link component
const Link = ({
  href,
  title,
  children,
}: {
  href: string
  title?: string
  children: React.ReactNode
}) => {
  const isExternal = href?.startsWith('http')
  return (
    <a
      href={href}
      title={title}
      className="text-desert-orange font-medium hover:text-desert-orange-dark underline decoration-desert-orange-lighter/50 underline-offset-2 hover:decoration-desert-orange transition-colors"
      {...(isExternal ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
    >
      {children}
    </a>
  )
}

// Inline code component
const InlineCode = ({ content, children }: { content?: string; children?: React.ReactNode }) => {
  return (
    <code className="bg-desert-green-lighter/30 text-desert-green-darker border border-desert-green-lighter/50 px-1.5 py-0.5 rounded text-[0.875em] font-mono">
      {content || children}
    </code>
  )
}

// Code block component
const CodeBlock = ({
  content,
  language,
  children,
}: {
  content?: string
  language?: string
  children?: React.ReactNode
}) => {
  const code = content || (typeof children === 'string' ? children : '')
  return (
    <div className="my-6 overflow-hidden rounded-lg border border-desert-green-dark/20">
      {language && (
        <div className="bg-desert-green-dark px-4 py-1.5 text-xs font-mono text-desert-green-lighter uppercase tracking-wider">
          {language}
        </div>
      )}
      <pre className="bg-desert-green-darker overflow-x-auto p-4">
        <code className="text-sm font-mono text-desert-green-lighter leading-relaxed whitespace-pre">
          {code}
        </code>
      </pre>
    </div>
  )
}

// Horizontal rule component
const HorizontalRule = () => {
  return (
    <hr className="my-10 border-0 h-px bg-gradient-to-r from-transparent via-desert-tan-lighter to-transparent" />
  )
}

// Kladez: «Что нового» — день обновлений. Сверху цветная полоса с датой и версиями,
// под ней — что появилось в этот день.
const Release = ({
  date,
  versions,
  children,
}: {
  date: string
  versions?: string
  children: React.ReactNode
}) => {
  const list = (versions ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
  return (
    <section className="mb-10">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-desert-green px-5 py-3 text-white shadow-sm">
        <span className="text-lg font-semibold">{date}</span>
        {list.length > 0 && (
          <span className="flex flex-wrap gap-2">
            {list.map((v) => (
              <span key={v} className="rounded-full bg-white/15 px-2.5 py-0.5 text-sm font-semibold">
                {v}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="mt-4 border-l-4 border-desert-tan-lighter pl-5">{children}</div>
    </section>
  )
}

// Callout component
const Callout = ({
  type = 'info',
  title,
  children,
}: {
  type?: string
  title?: string
  children: React.ReactNode
}) => {
  const styles: Record<string, string> = {
    info: 'bg-desert-sand/60 border-desert-olive text-desert-green-darker',
    warning: 'bg-desert-orange-lighter/15 border-desert-orange text-desert-green-darker',
    error: 'bg-desert-red-lighter/15 border-desert-red text-desert-green-darker',
    success: 'bg-desert-olive-lighter/15 border-desert-olive text-desert-green-darker',
  }

  return (
    <div className={`border-l-4 rounded-r-lg p-5 mb-6 ${styles[type] || styles.info}`}>
      {title && <h4 className="font-semibold mb-2">{title}</h4>}
      <div className="[&>p:last-child]:mb-0">{children}</div>
    </div>
  )
}

// Component mapping for Markdoc
const components = {
  Paragraph,
  Image,
  Link,
  InlineCode,
  CodeBlock,
  HorizontalRule,
  Callout,
  Release,
  Heading,
  List,
  ListItem,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableHeader,
  TableCell,
}

interface MarkdocRendererProps {
  content: any // Markdoc transformed content
}

const MarkdocRenderer: React.FC<MarkdocRendererProps> = ({ content }) => {
  return (
    <div className="text-base tracking-wide">{Markdoc.renderers.react(content, React, { components })}</div>
  )
}

export default MarkdocRenderer
