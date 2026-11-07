import Markdoc from '@markdoc/markdoc'
import { streamToString } from '../../util/docs.js'
import { getFile, getFileStatsIfExists, listDirectoryContentsRecursive } from '../utils/fs.js'
import path from 'path'
import { readFile } from 'node:fs/promises'
import { DEFAULT_LOCALE, getLocale } from '../../constants/i18n/index.js'
import { docCandidates, normalizeSlug, sortDocs, titleFromMarkdown } from '../utils/docs_pages.js'
import InternalServerErrorException from '#exceptions/internal_server_error_exception'
import logger from '@adonisjs/core/services/logger'

export class DocsService {
  private docsPath = path.join(process.cwd(), 'docs')

  /** Страницы справки на текущем языке интерфейса (заголовок — из «# …» файла). */
  async getDocs() {
    const files: Array<{ title: string; slug: string }> = []
    const seen = new Set<string>()
    const langs = getLocale() === DEFAULT_LOCALE ? [DEFAULT_LOCALE] : [getLocale(), DEFAULT_LOCALE]

    for (const lang of langs) {
      const dir = path.join(this.docsPath, lang)
      if (!(await getFileStatsIfExists(dir))) continue
      for (const item of await listDirectoryContentsRecursive(dir)) {
        if (item.type !== 'file' || !item.name.endsWith('.md')) continue
        const slug = normalizeSlug(item.name)
        if (!slug || seen.has(slug)) continue
        seen.add(slug)
        const content = await readFile(item.key, 'utf-8')
        files.push({ title: titleFromMarkdown(content, slug), slug })
      }
    }

    return sortDocs(files)
  }

  parse(content: string) {
    try {
      const ast = Markdoc.parse(content)
      const config = this.getConfig()
      const errors = Markdoc.validate(ast, config)

      // Filter out attribute-undefined errors which may be caused by emojis and special characters
      const criticalErrors = errors.filter((e) => e.error.id !== 'attribute-undefined')
      if (criticalErrors.length > 0) {
        logger.error('Markdoc validation errors:', errors.map((e) => JSON.stringify(e.error)).join(', '))
        throw new Error('Markdoc validation failed')
      }

      return Markdoc.transform(ast, config)
    } catch (error) {
      logger.error('Error parsing Markdoc content:', error)
      throw new InternalServerErrorException(`Error parsing content: ${(error as Error).message}`)
    }
  }

  async parseFile(_filename: string) {
    try {
      const slug = normalizeSlug(_filename)
      if (!slug) {
        throw new Error('Invalid document slug')
      }

      for (const fullPath of docCandidates(this.docsPath, getLocale(), DEFAULT_LOCALE, slug)) {
        if (!(await getFileStatsIfExists(fullPath))) continue
        const fileStream = await getFile(fullPath, 'stream')
        if (!fileStream) {
          throw new Error(`Failed to read file stream: ${slug}`)
        }
        return this.parse(await streamToString(fileStream))
      }
      throw new Error(`File not found: ${slug}.md`)
    } catch (error) {
      throw new InternalServerErrorException(`Error parsing file: ${(error as Error).message}`)
    }
  }

  private getConfig() {
    return {
      tags: {
        callout: {
          render: 'Callout',
          attributes: {
            type: {
              type: String,
              default: 'info',
              matches: ['info', 'warning', 'error', 'success'],
            },
            title: {
              type: String,
            },
          },
        },
      },
      nodes: {
        heading: {
          render: 'Heading',
          attributes: {
            level: { type: Number, required: true },
            id: { type: String },
          },
        },
        list: {
          render: 'List',
          attributes: {
            ordered: { type: Boolean },
            start: { type: Number },
          },
        },
        list_item: {
          render: 'ListItem',
          attributes: {
            marker: { type: String },
            className: { type: String },
            class: { type: String }
          }
        },
        table: {
          render: 'Table',
        },
        thead: {
          render: 'TableHead',
        },
        tbody: {
          render: 'TableBody',
        },
        tr: {
          render: 'TableRow',
        },
        th: {
          render: 'TableHeader',
        },
        td: {
          render: 'TableCell',
        },
        paragraph: {
          render: 'Paragraph',
        },
        image: {
          render: 'Image',
          attributes: {
            src: { type: String, required: true },
            alt: { type: String },
            title: { type: String },
          },
        },
        link: {
          render: 'Link',
          attributes: {
            href: { type: String, required: true },
            title: { type: String },
          },
        },
        fence: {
          render: 'CodeBlock',
          attributes: {
            content: { type: String },
            language: { type: String },
          },
        },
        code: {
          render: 'InlineCode',
          attributes: {
            content: { type: String },
          },
        },
        hr: {
          render: 'HorizontalRule',
        },
      },
    }
  }
}
