/**
 * Kladez: the project's own open repository. App update checks read its GitHub
 * releases (plain GET, nothing about the user is sent).
 */
export const KLADEZ_REPO = 'Leon-Kladez/kladez'
/**
 * Kladez: страница проекта и список ошибок/предложений — для «Как помочь «Кладезъ»».
 * Репозиторий пока не публичный: адрес меняется здесь, в одном месте.
 */
export const KLADEZ_PROJECT_URL = `https://github.com/${KLADEZ_REPO}`
export const KLADEZ_ISSUES_URL = `${KLADEZ_PROJECT_URL}/issues`
/**
 * Kladez: открыт ли репозиторий всем. Пока нет — ссылки на GitHub в «Как помочь»
 * не показываются (у посторонних они открывали бы «404»), а «Поделиться» шлёт
 * текст без ссылки. После публикации: поставить true (и при смене адреса — KLADEZ_REPO).
 */
export const KLADEZ_REPO_PUBLIC = true
/**
 * Kladez: добровольный сбор автора (СБП, Озон Банк) для карточки «Поблагодарить».
 * QR-код того же адреса — public/thanks/kladez-thanks-qr.svg (сделан из этой ссылки).
 */
export const KLADEZ_THANKS_URL = 'https://finance.ozon.ru/apps/sbp/ozonbankpay/867cf607-0ea3-46b2-b593-573aa6ebbd0c'
/** Kladez: адрес, по которому люди скачивают Кладезъ (для «Поделиться»); пусто — пока не опубликован. */
export const KLADEZ_DOWNLOAD_URL = KLADEZ_REPO_PUBLIC ? `${KLADEZ_PROJECT_URL}/releases/latest` : ''
export const KLADEZ_RELEASES_API_URL = `https://api.github.com/repos/${KLADEZ_REPO}/releases`

/**
 * Kladez: стартовый файл библиотеки — без него Kiwix не запускается. Медицинская
 * Википедия без картинок (139 МБ, 32 874 статьи, CC BY-SA 4.0, см. NOTICE): даже
 * если больше ничего не скачать, в доме будет медицина и первая помощь.
 * Файл встроен в образ (`bundledPath`; Dockerfile качает его при сборке с
 * download.kiwix.org и проверяет SHA-256). В репозиторий не кладём — больше
 * лимита GitHub. `urls` — запасные адреса на случай образа без файла: сам
 * Kiwix и проверенные зеркала из collections-ru/mirrors.json (ru_check: ok).
 */
const STARTER_ZIM_FILE = 'wikipedia_ru_medicine_nopic_2026-10.zim'
const STARTER_ZIM_PATH = `wikipedia/${STARTER_ZIM_FILE}`
export const STARTER_ZIM_MIRRORS = [
  'https://download.kiwix.org/zim/',
  'https://ftp.fau.de/kiwix/zim/',
  'https://mirrors.dotsrc.org/kiwix/zim/',
  'https://ftp.nluug.nl/pub/kiwix/zim/',
  'https://mirror.accum.se/mirror/kiwix.org/zim/',
  'https://dumps.wikimedia.org/kiwix/zim/',
] as const

export const STARTER_ZIM = {
  filename: STARTER_ZIM_FILE,
  sha256: '8e6d2f8fcd01544dac3db5b833681ba408feaff10717d6c8966a959ee14dddb8',
  sizeBytes: 139_051_939,
  bundledPath: `/app/assets/kiwix/${STARTER_ZIM_FILE}`,
  urls: STARTER_ZIM_MIRRORS.map((base) => `${base}${STARTER_ZIM_PATH}`),
} as const

/**
 * Kladez: прежние стартовые файлы. При обновлении панели такой файл убирается
 * один раз, если это ровно файл из старого образа (та же SHA-256) и человек не
 * выбирал его сам (см. app/utils/starter_sync.ts). Добавляйте сюда стартовый
 * файл, когда меняете STARTER_ZIM.
 */
export const PREVIOUS_STARTER_ZIMS = [
  {
    filename: 'vikidia_ru_all_nopic_2026-09.zim',
    sha256: 'bccae35511f9de614f72f409cda56a4153cf133fc66106d0cbc2fa747bf11e92',
  },
] as const

/**
 * Kladez: features of upstream NOMAD that send data to NOMAD's servers and are
 * switched off in Kladez. The UI hides them; the server refuses them anyway.
 */
export const KLADEZ_FEATURES = {
  /** E-mail subscription to NOMAD release notes. */
  releaseNotesEmail: false,
  /** Uploading benchmark results to NOMAD's shared leaderboard. */
  benchmarkSharing: false,
  /**
   * Обновление «внутри» панели (новые образы из реестра). Образы Кладезя в реестр пока
   * не выкладываются, поэтому новая версия ставится новым установщиком из выпуска.
   */
  inAppUpdate: false,
} as const
