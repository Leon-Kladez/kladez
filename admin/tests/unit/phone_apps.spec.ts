import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseSha256Sum, pickAndroidRelease } from '../../app/utils/phone_apps.js'

const apk = (name: string, size = 66_000_000) => ({ name, size, browser_download_url: `https://example.org/${name}` })

test('«Карты в дорогу»: свежий выпуск для Android с файлом .apk и его контрольной суммой', () => {
  const releases = [
    { tag_name: '2026.11.12-1-ios', assets: [] },
    { tag_name: '2026.11.11-39-android', prerelease: true, assets: [apk('A.apk'), apk('A.apk.sha256sum', 90)] },
    { tag_name: '2026.11.10-2-android', assets: [apk('B.apk')] }, // без контрольной суммы — пропускаем
    { tag_name: '2026.11.01-7-android', assets: [apk('C.apk'), apk('C.apk.sha256sum', 90)] },
  ]
  const r = pickAndroidRelease(releases)
  assert.ok(r)
  assert.equal(r.version, '2026.11.01-7')
  assert.equal(r.apkName, 'C.apk')
  assert.equal(r.sumUrl, 'https://example.org/C.apk.sha256sum')
  assert.equal(pickAndroidRelease([]), null)
  assert.equal(pickAndroidRelease({ message: 'rate limit' } as any), null)
})

test('«Карты в дорогу»: отпечаток из файла .sha256sum', () => {
  const sha = 'A'.repeat(64)
  assert.equal(parseSha256Sum(`${sha}  OrganicMaps-26111139-web-release.apk\n`), 'a'.repeat(64))
  assert.equal(parseSha256Sum(sha), 'a'.repeat(64))
  assert.equal(parseSha256Sum('not a hash'), null)
  assert.equal(parseSha256Sum(''), null)
})
