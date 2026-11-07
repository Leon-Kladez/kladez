import type { HttpContext } from '@adonisjs/core/http'
import KVStore from '#models/kv_store'
import { phoneUrl, qrPath, readLanAddresses } from '../utils/lan_addresses.js'
import { resolveDeviceAccess } from '#middleware/phone_access_middleware'

/** «Кладезъ»: «Открыть на телефоне» — адреса компьютера в домашней сети и QR-коды к ним. */
export default class PhonesController {
  async settings({ inertia }: HttpContext) {
    return inertia.render('settings/phones', {
      allowChanges: (await KVStore.getValue('phones.allowChanges')) === true,
    })
  }

  async info(ctx: HttpContext) {
    const device = await resolveDeviceAccess(ctx)
    const { addresses, port } = await readLanAddresses()
    return {
      device,
      allowChanges: (await KVStore.getValue('phones.allowChanges')) === true,
      // Для проверки на ВМ: с какого адреса панель видит этот запрос.
      seenFrom: ctx.request.request.socket?.remoteAddress ?? null,
      addresses: addresses.map((a) => {
        const url = phoneUrl(a.ip, port)
        return { ...a, url, qr: qrPath(url) }
      }),
    }
  }
}
