import { defineConfig } from '@adonisjs/static'

/**
 * Configuration options to tweak the static files middleware.
 * The complete set of options are documented on the
 * official documentation website.
 *
 * https://docs.adonisjs.com/guides/static-assets
 */
const staticServerConfig = defineConfig({
  enabled: true,
  etag: true,
  lastModified: true,
  dotFiles: 'ignore',
  acceptRanges: true,
  // Кладезъ: у файлов интерфейса в имени отпечаток версии (app-16aEuLk0.js) — их можно
  // не перепроверять: новая версия придёт под новым именем. Телефон открывает быстрее.
  headers: (path: string) =>
    /[\/]assets[\/]/.test(path) ? { 'Cache-Control': 'public, max-age=31536000, immutable' } : {},
})

export default staticServerConfig
