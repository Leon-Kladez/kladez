import type { kbGuardrailEn } from '../en/kbGuardrail.js'

export const kbGuardrailRu: Record<keyof typeof kbGuardrailEn, string> = {
  'kbGuardrail.title': 'Подтвердите большую обработку для ИИ',
  'kbGuardrail.estimate': 'Чтобы ИИ-помощник мог искать по этим материалам, понадобится примерно {size} на диске — сверх самих скачанных файлов.',
  'kbGuardrail.freeSpace': 'Это больше 10% оставшегося свободного места (свободно {size}). Обработка может идти несколько часов, и прервать её без последствий сложно.',
  'kbGuardrail.manualHint': 'Если хотите решать по каждому материалу отдельно, нажмите «Отмена» и в разделе «База знаний» переключите автоматическую обработку на {manual}.',
  'kbGuardrail.manual': 'Вручную',
  'kbGuardrail.proceed': 'Всё равно продолжить',
}
