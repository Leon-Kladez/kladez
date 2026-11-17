// «Кладезъ»: «Карты в дорогу» — выбор выпуска Organic Maps и разбор контрольной суммы (без Adonis — для тестов).

export type ApkRelease = { version: string; apkUrl: string; apkName: string; size: number; sumUrl: string }

/** Свежий выпуск для Android: метка «…-android», файл .apk и рядом его .sha256sum. */
export function pickAndroidRelease(releases: any[]): ApkRelease | null {
  for (const r of Array.isArray(releases) ? releases : []) {
    if (!r || r.draft || r.prerelease || !String(r.tag_name ?? '').endsWith('-android')) continue
    const assets: any[] = Array.isArray(r.assets) ? r.assets : []
    const apk = assets.find((a) => /\.apk$/i.test(String(a?.name ?? '')))
    if (!apk) continue
    const sum = assets.find((a) => String(a?.name ?? '') === `${apk.name}.sha256sum`)
    if (!sum) continue
    return {
      version: String(r.tag_name).replace(/-android$/, ''),
      apkUrl: String(apk.browser_download_url),
      apkName: String(apk.name),
      size: Number(apk.size) || 0,
      sumUrl: String(sum.browser_download_url),
    }
  }
  return null
}

/** Отпечаток из файла .sha256sum («<sha256>  <имя>» или только sha256). */
export function parseSha256Sum(text: string): string | null {
  const m = /^\s*([0-9a-f]{64})\b/i.exec(text ?? '')
  return m ? m[1].toLowerCase() : null
}
