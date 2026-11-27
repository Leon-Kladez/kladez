// Kladez: phones in the home network — QR code and "view only" mode (not in Project NOMAD).
export const phonesEn = {
  'phones.nav': 'Phones',
  'phones.readOnly.error': 'Changes can only be made on the computer.',
  'phones.readOnly.bannerTitle': 'Opened from a phone',
  'phones.readOnly.bannerText':
    'You can read, look at maps and ask the AI assistant. Changes can only be made on the computer.',
  'phones.validate.boolean': 'The value must be "on" or "off".',
  'phones.open.title': 'Open on a phone',
  'phones.open.hint':
    'Point the phone camera at this square and tap the link that appears. The phone must be on the same Wi-Fi as this computer.',
  'phones.open.orType': 'Or type this address in the phone browser:',
  'phones.open.otherAddresses': 'If it does not open, try another address:',
  'phones.open.loading': 'Finding the address of this computer…',
  'phones.open.noneTitle': 'Could not find the address of this computer in the home network',
  'phones.open.noneText':
    'Check that the computer is connected to Wi-Fi or to the router with a cable, then restart Kladez.',
  'phones.open.qrAlt': 'QR code with the address {url}',
  'phones.kind.wifi': 'Wi-Fi',
  'phones.kind.ethernet': 'Cable',
  'phones.kind.other': 'Network',
  'phones.settings.intro':
    'Phones and tablets at home can open Kladez over Wi-Fi: read the library, look at maps, ask the AI assistant.',
  'phones.settings.accessTitle': 'What phones may do',
  'phones.settings.allowLabel': 'Let phones make changes',
  'phones.settings.allowDescription':
    'Off (recommended): phones can only read and look. On: from any phone on your Wi-Fi you can install and remove apps, download and change settings. Turn it on only if you trust everyone connected to your Wi-Fi.',
  'phones.settings.autostartTitle': 'Start with Windows',
  'phones.settings.autostartLabel': 'Start Kladez with Windows',
  'phones.settings.autostartDescription': 'On: Kladez starts when you sign in to Windows, so it opens at once and phones can open it any time; it uses about 2 GB of memory. Off: the memory stays free and Kladez starts from the desktop shortcut; the first opening takes about a minute.',
  'phones.settings.saved': 'Saved',
  'phones.settings.saveFailed': 'Could not save',
  'phones.settings.computerOnly': 'This switch can only be changed on the computer.',
  'phones.travel.title': 'Maps for the road on your phone',
  'phones.travel.intro':
    'Organic Maps is a free navigator: download countries to the phone and it guides you by GPS without internet — by car, on foot or by bike. No ads, no tracking. Kladez gives the Android app to phones in your home straight from this computer, with no app store.',
  'phones.travel.prepare': 'Prepare the app for phones',
  'phones.travel.prepareNote': 'About 66 MB, downloaded once while there is internet.',
  'phones.travel.downloading': 'Downloading the app… {pct}%',
  'phones.travel.errorNetwork': 'No internet connection — prepare the app when the internet is back.',
  'phones.travel.errorFailed': 'Could not download the app. Try again.',
  'phones.travel.notReadyPhone': 'The app is not prepared yet — do it on the computer: Settings → Phones.',
  'phones.travel.scan':
    'Point the phone camera at this square and tap the link — the app downloads. Open the file and allow the installation.',
  'phones.travel.onPhone': 'Download the app to this phone',
  'phones.travel.ready': 'Organic Maps {version}, {size}',
  'phones.travel.update': 'Check for a new version',
  'phones.travel.iphone': 'iPhone: install “Organic Maps” from the App Store.',
  'phones.travel.help': 'How to use it on the road',
} as const
