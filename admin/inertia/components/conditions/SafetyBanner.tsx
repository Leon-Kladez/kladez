import { IconAlertTriangle } from '@tabler/icons-react'
import { tx } from '~/lib/tx'
import { t } from '../../../constants/i18n'

/**
 * "When to use what" — top-of-page safety banner.
 *
 * A prominent amber callout that renders at the TOP of both the condition index
 * and detail pages: results are FDA label-indication matches, NOT
 * recommendations, NOT an FDA endorsement, and NOT a drug-interaction checker.
 * It leads the page (not a footnote) so the caveat is read before any result.
 */
export default function SafetyBanner() {
  return (
    <div role="alert" className="mb-6 rounded-lg border-2 border-amber-400 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <IconAlertTriangle
          size={22}
          className="mt-0.5 flex-shrink-0 text-amber-600"
          aria-hidden="true"
        />
        <div className="text-sm text-amber-900">
          <p className="font-bold mb-1">{t('safety.banner.title')}</p>
          <ul className="list-disc pl-5 space-y-0.5 text-amber-800">
            <li>
              {tx('safety.banner.matches', {
                notRec: <strong>{t('safety.banner.notRecommendation')}</strong>,
                notFda: <strong>{t('safety.banner.notEndorsement')}</strong>,
              })}
            </li>
            <li>
              {tx('safety.banner.notChecker', { strong: <strong>{t('drugDisclaimer.notCheckerStrong')}</strong> })}
            </li>
            <li>
              {tx('safety.banner.emergency', { strong: <strong>{t('drugDisclaimer.emergencyStrong')}</strong> })}
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}
