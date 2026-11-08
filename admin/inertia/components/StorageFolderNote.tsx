// «Кладезъ»: где на диске лежат файлы раздела — путь «как в Проводнике» по шагам
// и предупреждение, что переносить и переименовывать их руками нельзя.
import { useState } from 'react'
import { IconAlertTriangle, IconChevronRight, IconCopy, IconFolder } from '@tabler/icons-react'
import { t } from '../../constants/i18n'

export default function StorageFolderNote({
  libraryPath,
  folder,
}: {
  /** Папка библиотеки в виде Windows, например D:\Kladez\library. Пусто — блок не показываем. */
  libraryPath?: string | null
  /** Подпапка раздела: zim — книги, maps — карты. */
  folder: string
}) {
  const [copied, setCopied] = useState(false)
  if (!libraryPath) return null
  const full = `${libraryPath.replace(/\\+$/, '')}\\${folder}`
  // «D:\Kladez\library\zim» → «Этот компьютер › D: › Kladez › library › zim».
  const steps = [t('storageNote.thisPc'), ...full.split('\\').filter(Boolean)]

  async function copy() {
    try {
      await navigator.clipboard.writeText(full)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Страница не «безопасная» (телефон по http) — путь и так виден на экране.
    }
  }

  return (
    <section className="mt-6 rounded-lg border-2 border-border-subtle bg-surface-primary p-4">
      <h2 className="flex items-center gap-2 font-semibold text-text-primary">
        <IconFolder className="size-5 shrink-0" aria-hidden="true" />
        {t('storageNote.title')}
      </h2>
      <ol className="mt-3 flex flex-wrap items-center gap-1 text-sm" aria-label={full}>
        {steps.map((step, i) => (
          <li key={`${step}-${i}`} className="flex items-center gap-1">
            {i > 0 && <IconChevronRight className="size-4 text-text-muted" aria-hidden="true" />}
            <span
              className={
                i === steps.length - 1
                  ? 'rounded bg-desert-green px-2 py-0.5 font-semibold text-white'
                  : 'rounded bg-surface-secondary px-2 py-0.5 text-text-secondary'
              }
            >
              {step}
            </span>
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <code className="rounded bg-surface-secondary px-2 py-1 text-sm">{full}</code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1 text-sm font-semibold text-desert-green hover:underline"
        >
          <IconCopy className="size-4" aria-hidden="true" />
          {copied ? t('storageNote.copied') : t('storageNote.copy')}
        </button>
      </div>
      <p className="mt-3 flex items-start gap-2 text-sm text-desert-orange">
        <IconAlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        {t('storageNote.warning')}
      </p>
    </section>
  )
}
