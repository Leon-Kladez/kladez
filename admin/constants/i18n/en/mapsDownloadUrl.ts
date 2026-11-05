export const mapsDownloadUrlEn = {
  'mapsDownloadUrl.description': 'Enter the URL of the map region file you wish to download. The URL must be publicly reachable and end with .pmtiles. A preflight check will be run to verify the file\'s availability, type, and approximate size.',
  'mapsDownloadUrl.placeholder': 'Enter download URL...',
  'mapsDownloadUrl.checking': 'Running preflight check for URL: {url}',
  'mapsDownloadUrl.unknownError': 'An unknown error occurred during the preflight check.',
  'mapsDownloadUrl.passed': 'Preflight check passed. Filename: {filename}, Size: {size}',
  'mapsDownloadUrl.failed': 'Preflight check failed: {error}',
} as const
