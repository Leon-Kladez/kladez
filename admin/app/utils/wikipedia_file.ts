/**
 * Kladez: is this the user's main Wikipedia file (the one WikipediaSelection
 * manages), in any language? Upstream NOMAD hard-coded `wikipedia_en_`, which
 * would treat the Russian Wikipedia as an ordinary file and never mark the
 * selection installed. Topic sets (`wikipedia_ru_medicine_maxi`) are tier
 * resources, not the main Wikipedia, and must not match.
 */
const MAIN_WIKIPEDIA = /^wikipedia_[a-z-]{2,12}_(all|top)_(maxi|nopic|mini)_\d{4}-\d{2}\.zim$/

export function isWikipediaMainFile(filenameOrUrl: string): boolean {
  const name = filenameOrUrl.split('/').pop() ?? ''
  return MAIN_WIKIPEDIA.test(name)
}
