export const serverValidateEn = {
  'serverValidate.timeWindow': 'Time window values must be in 24-hour HH:MM format (e.g. "20:00").',
  'serverValidate.cooloff': 'Cool-off must be a whole number of hours between 0 and 8760.',
  'serverValidate.urlString': 'Test URL must be a string.',
  'serverValidate.urlValid': 'Test URL must be a valid URL (e.g. "https://example.com").',
  'serverValidate.cap': 'The per-window data cap must be a whole number of bytes (0 = unlimited).',
  'serverValidate.context': 'Context window must be "auto" or one of: {values}.',
  'serverValidate.relevance': 'Relevance threshold must be a number between 0 and 1, or empty to use the recommended default.',
  'serverValidate.style': 'Response style must be one of: {values}.',
  'serverValidate.keepAlive': 'Keep-alive must be a duration like "10m", "1h", or "-1" to keep the model loaded indefinitely.',
  'serverValidate.gfx': 'GFX override must be a version like "11.0.0", "none", or empty to use the detected default.',
  'serverValidate.uiMode': 'Panel mode must be one of: {values}.',
  'serverValidate.language': 'Interface language must be one of: {values}.',
} as const
