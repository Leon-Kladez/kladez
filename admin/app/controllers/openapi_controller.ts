import { createRequire } from 'node:module'
import { existsSync, readFileSync } from 'node:fs'
import type { HttpContext } from '@adonisjs/core/http'
import { buildOpenApiDocument } from '#start/openapi/generator'
import { getLocale } from '../../constants/i18n/index.js'

const require = createRequire(import.meta.url)

/**
 * The self-contained Scalar browser bundle, read from the installed
 * `@scalar/api-reference` package and cached in memory. Served from this app
 * (not a CDN) so the API reference works on an offline appliance.
 */
let scalarBundle: string | null = null

// Kladez: the image ships only the prebuilt bundle (see Dockerfile); the package
// itself is a build-time dependency. In development it is read from node_modules.
const SHIPPED_SCALAR_BUNDLE = new URL('../../resources/scalar/standalone.js', import.meta.url)

function getScalarBundle(): string {
  if (scalarBundle === null && existsSync(SHIPPED_SCALAR_BUNDLE)) {
    scalarBundle = readFileSync(SHIPPED_SCALAR_BUNDLE, 'utf-8')
  }
  if (scalarBundle === null) {
    const entry = require.resolve('@scalar/api-reference')
    const marker = '/node_modules/@scalar/api-reference/'
    const root = entry.slice(0, entry.lastIndexOf(marker) + marker.length - 1)
    scalarBundle = readFileSync(`${root}/dist/browser/standalone.js`, 'utf-8')
  }
  return scalarBundle
}

/**
 * The reference page mounts Scalar against our locally served bundle and spec.
 * Scalar auto-detects the `#api-reference` element and reads `data-url`.
 */
const referenceHtml = (locale: string) => `<!doctype html>
<html lang="${locale}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Кладезъ API</title>
  </head>
  <body>
    <div id="app"></div>
    <script src="/reference/assets/standalone.js"></script>
    <script>
      Scalar.createApiReference('#app', {
        url: '/api/openapi.json',
        hideClientButton: true,
        telemetry: false,
        theme: 'saturn',
        // «Кладезъ»: по-русски и без облачных кнопок Scalar (Ask AI, Generate MCP,
        // Share/Deploy) — страница ничего не отправляет за пределы компьютера.
        localization: { locale: '${locale}' },
        agent: { disabled: true },
        mcp: { disabled: true },
        showDeveloperTools: 'never',
      })
    </script>
  </body>
</html>`

export default class OpenApiController {
  /**
   * The generated OpenAPI 3.1 document.
   */
  async spec({ response }: HttpContext) {
    return response.json(buildOpenApiDocument())
  }

  /**
   * The interactive Scalar API reference page.
   */
  async reference({ response }: HttpContext) {
    // Язык интерфейса Scalar — тот же, что у панели (ru / en).
    return response.header('content-type', 'text/html').send(referenceHtml(getLocale()))
  }

  /**
   * The locally bundled Scalar JS (kept off any CDN for offline use).
   */
  async standalone({ response }: HttpContext) {
    return response
      .header('content-type', 'application/javascript; charset=utf-8')
      .header('cache-control', 'public, max-age=86400')
      .send(getScalarBundle())
  }
}
