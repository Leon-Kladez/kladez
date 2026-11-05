// Kladez: shows how well an AI model understands Russian (field `ru` from
// collections-ru/ai-models.json). Nothing is shown when it is unknown.
import classNames from 'classnames'
import { IconLanguage } from '@tabler/icons-react'
import { t } from '../../constants/i18n'

export interface RussianLanguageBadgeProps {
  ru?: 'good' | 'fair'
  className?: string
}

const RussianLanguageBadge: React.FC<RussianLanguageBadgeProps> = ({ ru, className }) => {
  if (!ru) return null
  const good = ru === 'good'
  return (
    <span
      title={good ? t('aiModels.ru.goodHint') : t('aiModels.ru.fairHint')}
      className={classNames(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium',
        good ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800',
        className
      )}
    >
      <IconLanguage className="w-3.5 h-3.5" />
      {good ? t('aiModels.ru.good') : t('aiModels.ru.fair')}
    </span>
  )
}

export default RussianLanguageBadge
