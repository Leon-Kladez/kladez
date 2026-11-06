import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import { syncLocaleFromStore } from '../utils/locale_store.js'

/** Перед каждым запросом: t() на сервере говорит на языке из настроек панели. */
export default class LocaleMiddleware {
  async handle(_ctx: HttpContext, next: NextFn) {
    await syncLocaleFromStore()
    return next()
  }
}
