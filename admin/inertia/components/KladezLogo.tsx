import classNames from 'classnames'

// Логотип «Кладезъ» (вариант B): «Кладезъ» шрифтом Ponomar → тонкая черта → «КЛАДЕЗЬ ЗНАНИЙ» шрифтом Old Standard TT.
// Буквы переведены в контуры (public/kladez-logo*.svg), поэтому логотип не зависит от шрифтов.
// SVG используется как маска, а цвет берётся из --color-kladez-ink — так логотип виден и в ночном режиме.
const FULL = { src: '/kladez-logo.svg', width: 363, height: 160 }
const COMPACT = { src: '/kladez-logo-compact.svg', width: 343, height: 120 }

export default function KladezLogo({
  compact,
  height: heightProp,
  className,
}: {
  compact?: boolean
  /** Высота в пикселях; по умолчанию 48 (compact) или 160 (полный логотип). */
  height?: number
  className?: string
}) {
  const logo = compact ? COMPACT : FULL
  const height = heightProp ?? (compact ? 48 : 160)
  const width = Math.round((logo.width / logo.height) * height)
  const mask = `url('${logo.src}') center / contain no-repeat`
  return (
    <span
      role="img"
      aria-label={compact ? 'Кладезъ' : 'Кладезъ — кладезь знаний'}
      className={classNames('inline-block max-w-full shrink-0 bg-kladez-ink', className)}
      style={{
        width,
        height: 'auto',
        aspectRatio: `${logo.width} / ${logo.height}`,
        WebkitMask: mask,
        mask,
      }}
    />
  )
}
