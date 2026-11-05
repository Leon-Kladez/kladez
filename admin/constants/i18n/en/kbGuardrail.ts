export const kbGuardrailEn = {
  'kbGuardrail.title': 'Confirm large AI indexing operation',
  'kbGuardrail.estimate': 'Indexing this batch for the AI Assistant will use approximately {size} of disk space for embeddings, on top of the raw downloads.',
  'kbGuardrail.freeSpace': 'That\'s more than 10% of your remaining free disk space ({size} free). Embedding can take several hours and is hard to interrupt cleanly once started.',
  'kbGuardrail.manualHint': 'If you\'d rather review per-item before indexing, cancel here and switch your Auto-index setting to {manual} from the Knowledge Base panel.',
  'kbGuardrail.manual': 'Manual',
  'kbGuardrail.proceed': 'Proceed anyway',
} as const
