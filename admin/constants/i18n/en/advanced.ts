export const advancedEn = {
  'advanced.saved': 'Setting updated successfully.',
  'advanced.subtitle': 'Advanced configuration for operators. These settings are optional — the defaults work for most deployments.',
  'advanced.connectivity': 'Connectivity',
  'advanced.connectivityText': 'Kladez periodically checks whether it can reach the internet. By default it probes Cloudflare\'s utility endpoint with a few fallbacks. Set a custom endpoint below if your network blocks the defaults. Leave blank to use the built-in defaults.',
  'advanced.envTitle': 'Managed by environment variable',
  'advanced.envMessage': 'The INTERNET_STATUS_TEST_URL environment variable is set and takes precedence over this setting. Remove it to manage the test URL here.',
  'advanced.testUrl': 'Internet Status Test URL',
  'advanced.testUrlHelp': 'A single http(s) URL used to check connectivity. Any HTTP response counts as online.',
  'advanced.urlScheme': 'Test URL must use http or https.',
} as const
