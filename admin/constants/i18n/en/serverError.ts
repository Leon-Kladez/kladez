export const serverErrorEn = {
  'serverError.noSpace': 'No space left on device',
  'serverError.dns': 'Cannot look up the server name: check the internet connection. If a VPN is on, turn it off or switch servers.',
  'serverError.noInternet': 'No internet connection',
  'serverError.http': 'Failed to download: HTTP {status}',
  'serverError.request': 'Kladez could not complete the action (error {status}). Try again; if it keeps failing, restart the program.',
  'serverError.stalled': 'Download stalled - no data received for 5 minutes',
  'serverError.aborted': 'Download aborted',
  'serverError.mime': 'MIME type {type} is not allowed',
  'serverError.gated': 'This content is hosted by Project NOMAD and requires an official release build.',
  'serverError.diskInsufficient': 'Insufficient disk space: {free} free, {required} required',
} as const
