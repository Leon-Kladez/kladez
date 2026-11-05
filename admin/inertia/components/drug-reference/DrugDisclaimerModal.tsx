import { Dialog, DialogBackdrop, DialogPanel, DialogTitle } from '@headlessui/react'
import { IconAlertTriangle } from '@tabler/icons-react'
import StyledButton from '~/components/StyledButton'
import { tx } from '~/lib/tx'
import { t } from '../../../constants/i18n'

/**
 * localStorage key for the Drug Reference disclaimer acknowledgement. Versioned:
 * bump the suffix if the disclaimer text changes materially so every browser is
 * re-prompted. Per-browser by design — a new browser/device gets the gate again.
 */
export const DRUG_DISCLAIMER_ACK_KEY = 'nomad:drugReferenceDisclaimer:v1'

export function hasAcknowledgedDrugDisclaimer(): boolean {
  if (typeof window === 'undefined') return true
  try {
    return window.localStorage.getItem(DRUG_DISCLAIMER_ACK_KEY) === 'ack'
  } catch {
    return false
  }
}

/**
 * First-open disclaimer gate for the Drug Reference. Blocks the page until the
 * user acknowledges (no backdrop / Escape dismissal). On acknowledgement the
 * acceptance is saved to this browser's localStorage so it isn't shown again on
 * this browser — other browsers/devices see it on their first open.
 */
export default function DrugDisclaimerModal({ open, onAcknowledge }: { open: boolean; onAcknowledge: () => void }) {
  const acknowledge = () => {
    try {
      window.localStorage.setItem(DRUG_DISCLAIMER_ACK_KEY, 'ack')
    } catch {
      // Private mode / storage disabled — still let them through for this session.
    }
    onAcknowledge()
  }

  return (
    <Dialog open={open} onClose={() => {}} className="relative z-50">
      <DialogBackdrop className="fixed inset-0 bg-black/60" />
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-end justify-center p-4 sm:items-center sm:p-0">
          <DialogPanel className="relative w-full transform overflow-hidden rounded-lg bg-surface-primary px-5 pb-5 pt-6 text-left shadow-xl transition-all sm:my-8 sm:max-w-lg sm:p-6">
            <div className="flex flex-col items-center text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-desert-orange/15 text-desert-orange-dark">
                <IconAlertTriangle size={26} />
              </span>
              <DialogTitle as="h3" className="mt-4 text-lg font-bold text-text-primary">
                {t('drugDisclaimer.title')}
              </DialogTitle>
            </div>

            <div className="mt-4 space-y-3 text-sm text-text-secondary">
              <p>
                {tx('drugDisclaimer.intro', {
                  labels: <strong>{t('drugDisclaimer.labels')}</strong>,
                  infoOnly: <strong>{t('drugDisclaimer.infoOnly')}</strong>,
                })}
              </p>
              <ul className="list-disc space-y-1.5 pl-5">
                <li>
                  {tx('drugDisclaimer.notAdvice', { strong: <strong>{t('drugDisclaimer.notAdviceStrong')}</strong> })}
                </li>
                <li>
                  {tx('drugDisclaimer.notChecker', { strong: <strong>{t('drugDisclaimer.notCheckerStrong')}</strong> })}
                </li>
                <li>
                  {t('drugDisclaimer.matches')}
                </li>
                <li>
                  {tx('drugDisclaimer.followLabel', { strong: <strong>{t('drugDisclaimer.followLabelStrong')}</strong> })}
                </li>
                <li>
                  {tx('drugDisclaimer.emergency', { strong: <strong>{t('drugDisclaimer.emergencyStrong')}</strong> })}
                </li>
              </ul>
              <p className="text-xs text-text-muted">
                {t('drugDisclaimer.source')}
              </p>
            </div>

            <div className="mt-6">
              <StyledButton variant="action" fullWidth onClick={acknowledge}>
                {t('drugDisclaimer.continue')}
              </StyledButton>
            </div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  )
}
