import type { ModelVisionCapability } from '../../types/ollama.js'
import { t } from '../../constants/i18n/index.js'

const TEMPORARY_IMAGE_NOTICE = t('vision.temporary')

export function visionAttachmentGuidance(capability: ModelVisionCapability): string {
  if (capability === 'unsupported') {
    return t('vision.unsupported')
  }

  if (capability === 'unknown') {
    return `${t('vision.unknown')} ${TEMPORARY_IMAGE_NOTICE}`
  }

  return TEMPORARY_IMAGE_NOTICE
}
