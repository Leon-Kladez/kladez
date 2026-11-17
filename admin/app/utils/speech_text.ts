/**
 * «Кладезъ»: чистка текста, который вернул Whisper. На тишине и шуме он «досочиняет» фразы из
 * субтитров, на которых учился («Продолжение следует…», «Субтитры сделал …»), и метки вроде
 * [BLANK_AUDIO] или (музыка). В поле ввода такое попадать не должно.
 */

const MARKERS = /\[[^\]]*\]|\((?:музыка|аплодисменты|смех|шум|music|applause|laughter|noise|silence)[^)]*\)/gi

const HALLUCINATIONS = [
  /^продолжение следует\.*$/i,
  /^субтитры (?:сделал|создавал|подогнал)[^.]*\.?$/i,
  /^редактор субтитров[^.]*\.?$/i,
  /^спасибо за просмотр[!.]*$/i,
  /^thank you for watching[!.]*$/i,
  /^thanks for watching[!.]*$/i,
  /^you$/i,
]

export function cleanTranscript(raw: string): string {
  const text = raw.replace(MARKERS, ' ').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  // Фраза-призрак целиком — значит, речи не было.
  if (HALLUCINATIONS.some((re) => re.test(text))) return ''
  return text
}
