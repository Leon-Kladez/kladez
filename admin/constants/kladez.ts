/**
 * Kladez: the project's own open repository. App update checks read its GitHub
 * releases (plain GET, nothing about the user is sent).
 */
export const KLADEZ_REPO = 'Leon-Kladez/kladez'
export const KLADEZ_RELEASES_API_URL = `https://api.github.com/repos/${KLADEZ_REPO}/releases`

/**
 * Kladez: the tiny ZIM Kiwix needs before it can start (it refuses an empty
 * library). Vikidia — a Russian encyclopedia for children, 1 MB, CC BY-SA 3.0 /
 * GFDL (see NOTICE). Shipped inside the image (`bundledPath`), so no download is
 * needed; the URLs are a fallback for images built without it. Our repository
 * first; Kiwix keeps only recent builds, so its link is the second choice.
 */
export const STARTER_ZIM = {
  filename: 'vikidia_ru_all_nopic_2026-09.zim',
  sha256: 'bccae35511f9de614f72f409cda56a4153cf133fc66106d0cbc2fa747bf11e92',
  bundledPath: '/app/assets/kiwix/vikidia_ru_all_nopic_2026-09.zim',
  urls: [
    `https://raw.githubusercontent.com/${KLADEZ_REPO}/main/install/vikidia_ru_all_nopic_2026-09.zim`,
    'https://download.kiwix.org/zim/vikidia/vikidia_ru_all_nopic_2026-09.zim',
  ],
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
