/**
 * Kladez: the project's own open repository. App update checks read its GitHub
 * releases (plain GET, nothing about the user is sent).
 */
export const KLADEZ_REPO = 'Leon-Kladez/kladez'
export const KLADEZ_RELEASES_API_URL = `https://api.github.com/repos/${KLADEZ_REPO}/releases`
