import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import {
  deviceAccess,
  isComputerClient,
  isRequestAllowed,
  PHONE_READ_ONLY_CODE,
  type DeviceAccess,
} from '../utils/phone_access.js'
import { phonesMayChange, trustedComputerAddresses } from '../utils/phone_access_store.js'
import { t } from '../../constants/i18n/index.js'

declare module '@adonisjs/core/http' {
  interface HttpContext {
    /** «Кладезъ»: запрос с самого компьютера или с телефона, и можно ли с него что-то менять. */
    device?: DeviceAccess
  }
}

export type PhoneAccessDeps = {
  trusted: () => readonly string[]
  phonesMayChange: () => Promise<boolean>
}

const defaultDeps: PhoneAccessDeps = { trusted: trustedComputerAddresses, phonesMayChange }

/** Определить устройство один раз на запрос (и для страниц ошибок, где middleware не было). */
export async function resolveDeviceAccess(
  ctx: HttpContext,
  deps: PhoneAccessDeps = defaultDeps
): Promise<DeviceAccess> {
  if (ctx.device) return ctx.device
  // Адрес сокета, а не request.ip(): X-Forwarded-For присылает сам клиент.
  const remote = ctx.request.request.socket?.remoteAddress
  const isComputer = isComputerClient(remote, deps.trusted())
  ctx.device = deviceAccess(isComputer, isComputer ? false : await deps.phonesMayChange())
  return ctx.device
}

/**
 * «Кладезъ»: телефоны в домашней сети только смотрят. Изменения (установка, удаление, настройки,
 * загрузки) — только с самого компьютера, если в Настройках не разрешено иное.
 * Проверка на сервере: скрытых кнопок мало, запрос можно отправить и руками.
 */
export default class PhoneAccessMiddleware {
  constructor(private deps: PhoneAccessDeps = defaultDeps) {}

  async handle(ctx: HttpContext, next: NextFn) {
    const access = await resolveDeviceAccess(ctx, this.deps)

    if (!isRequestAllowed(access, ctx.request.method(), ctx.request.url())) {
      const message = t('phones.readOnly.error')
      return ctx.response
        .status(403)
        .json({ success: false, code: PHONE_READ_ONLY_CODE, message, error: message })
    }
    return next()
  }
}
