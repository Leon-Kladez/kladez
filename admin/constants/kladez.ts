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
 * Kladez: features of upstream NOMAD that send data to NOMAD's servers and are
 * switched off in Kladez. The UI hides them; the server refuses them anyway.
 */
export const KLADEZ_FEATURES = {
  /** E-mail subscription to NOMAD release notes. */
  releaseNotesEmail: false,
  /** Uploading benchmark results to NOMAD's shared leaderboard. */
  benchmarkSharing: false,
} as const
