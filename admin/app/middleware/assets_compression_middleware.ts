import env from '#start/env'
import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import compression from 'compression'

/**
 * Кладезъ: сжатие файлов интерфейса (/assets/*.js, *.css). Их отдаёт static-middleware —
 * до маршрутов, где стоит обычное сжатие, поэтому без этого главный файл (~1,1 МБ) шёл
 * на телефон несжатым. Только /assets: файлы карт (pmtiles) читаются кусками — их не трогаем.
 */
const compress = env.get('DISABLE_COMPRESSION') ? null : compression()

export default class AssetsCompressionMiddleware {
  async handle({ request, response }: HttpContext, next: NextFn) {
    if (!compress || !request.url().startsWith('/assets/')) return await next()
    await new Promise<void>((resolve, reject) => {
      compress(request.request as any, response.response as any, (err?: any) => (err ? reject(err) : resolve()))
    })
    await next()
  }
}
